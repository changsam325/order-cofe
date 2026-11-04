param(
    [ValidateRange(1, 300)]
    [int]$DebounceSeconds = 5
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param([string[]]$Arguments)

    & git @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

function Add-WatchedPath {
    param(
        [string]$FullPath,
        [System.Collections.Generic.HashSet[string]]$Paths,
        [string]$RepositoryRoot
    )

    if ([string]::IsNullOrWhiteSpace($FullPath)) {
        return
    }

    $resolvedPath = [System.IO.Path]::GetFullPath($FullPath)
    $rootPrefix = $RepositoryRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) +
        [System.IO.Path]::DirectorySeparatorChar
    if (-not $resolvedPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return
    }

    $relativePath = $resolvedPath.Substring($rootPrefix.Length).Replace('\', '/')
    if ($relativePath -match '^(?:\.git|version-history)(?:/|$)') {
        return
    }

    [void]$Paths.Add($relativePath)
}

$repositoryRoot = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($repositoryRoot -join ''))) {
    throw '請在 Git 儲存庫中執行此腳本。'
}
$repositoryRoot = [System.IO.Path]::GetFullPath(($repositoryRoot -join '').Trim())

$branch = (& git branch --show-current 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($branch -join ''))) {
    throw '請先切換到具名分支；目前不支援 detached HEAD。'
}
$branch = ($branch -join '').Trim()

$remoteUrl = (& git remote get-url origin 2>$null)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($remoteUrl -join ''))) {
    throw "尚未設定 Git 遠端 'origin'。"
}

$initialStatus = (& git status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) {
    throw '無法檢查 Git 工作目錄。'
}
if (-not [string]::IsNullOrWhiteSpace(($initialStatus -join ''))) {
    throw 'Git 工作目錄尚未清潔；請先提交並推送既有變更，再啟動監看程式。'
}

$pendingPaths = [System.Collections.Generic.HashSet[string]]::new(
    [System.StringComparer]::OrdinalIgnoreCase
)
$watcher = [System.IO.FileSystemWatcher]::new($repositoryRoot)
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName `
    -bor [System.IO.NotifyFilters]::DirectoryName `
    -bor [System.IO.NotifyFilters]::LastWrite `
    -bor [System.IO.NotifyFilters]::Size
$watcher.InternalBufferSize = 65536

$sourcePrefix = "AutoGit-$PID"
$sourceIdentifiers = @(
    "$sourcePrefix.Changed",
    "$sourcePrefix.Created",
    "$sourcePrefix.Deleted",
    "$sourcePrefix.Renamed",
    "$sourcePrefix.Error"
)

try {
    Register-ObjectEvent -InputObject $watcher -EventName Changed -SourceIdentifier $sourceIdentifiers[0] | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier $sourceIdentifiers[1] | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Deleted -SourceIdentifier $sourceIdentifiers[2] | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Renamed -SourceIdentifier $sourceIdentifiers[3] | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName Error -SourceIdentifier $sourceIdentifiers[4] | Out-Null
    $watcher.EnableRaisingEvents = $true

    Write-Host "正在監看 $repositoryRoot（分支：$branch）。"
    Write-Host "檔案變更穩定 $DebounceSeconds 秒後會自動 commit 並 push；按 Ctrl+C 停止。"

    while ($true) {
        Wait-Event -Timeout 1 | Out-Null
        $events = @()
        $events += @(Get-Event | Where-Object { $_.SourceIdentifier -like "$sourcePrefix.*" })

        foreach ($watchEvent in $events) {
            if ($watchEvent.SourceIdentifier -notlike "$sourcePrefix.*") {
                continue
            }

            if ($watchEvent.SourceIdentifier -eq $sourceIdentifiers[4]) {
                $exception = $watchEvent.SourceEventArgs.GetException()
                Remove-Event -EventIdentifier $watchEvent.EventIdentifier
                throw "檔案監看失敗：$($exception.Message)"
            }

            $eventArgs = $watchEvent.SourceEventArgs
            Add-WatchedPath -FullPath $eventArgs.FullPath -Paths $pendingPaths -RepositoryRoot $repositoryRoot
            if ($watchEvent.SourceIdentifier -eq $sourceIdentifiers[3]) {
                Add-WatchedPath -FullPath $eventArgs.OldFullPath -Paths $pendingPaths -RepositoryRoot $repositoryRoot
            }
            Remove-Event -EventIdentifier $watchEvent.EventIdentifier
            $lastChange = Get-Date
        }

        if ($pendingPaths.Count -eq 0 -or $null -eq $lastChange) {
            continue
        }
        if (((Get-Date) - $lastChange).TotalSeconds -lt $DebounceSeconds) {
            continue
        }

        $changedPaths = @($pendingPaths | Sort-Object)
        $pendingPaths.Clear()
        $lastChange = $null

        & git diff --cached --quiet
        if ($LASTEXITCODE -eq 1) {
            throw 'Git 暫存區已有其他變更；請先提交或取消暫存，再重新啟動監看程式。'
        }
        if ($LASTEXITCODE -ne 0) {
            throw '無法檢查 Git 暫存區。'
        }

        $pathsToStage = [System.Collections.Generic.List[string]]::new()
        foreach ($path in $changedPaths) {
            & git check-ignore -q -- $path 2>$null
            if ($LASTEXITCODE -eq 0) {
                continue
            }
            if ($LASTEXITCODE -ne 1) {
                throw "無法確認 '$path' 是否已被 Git 忽略。"
            }
            $pathsToStage.Add($path)
        }

        if ($pathsToStage.Count -eq 0) {
            Write-Host '沒有可提交的非忽略變更。'
            continue
        }

        $timestamp = Get-Date
        $dateFolder = $timestamp.ToString('yyyy-MM-dd')
        $recordName = "auto-$($timestamp.ToString('HHmmssfff')).md"
        $recordRelativePath = "version-history/$dateFolder/$recordName"
        $recordDirectory = Join-Path $repositoryRoot "version-history\$dateFolder"
        [System.IO.Directory]::CreateDirectory($recordDirectory) | Out-Null

        $recordLines = @(
            "# 自動變更紀錄",
            "",
            "- 日期：$($timestamp.ToString('yyyy-MM-dd HH:mm:ss zzz'))",
            "- 分支：$branch",
            "- 變更檔案："
        )
        foreach ($path in $pathsToStage) {
            $recordLines += "  - ``$path``"
        }
        $recordContent = ($recordLines -join [Environment]::NewLine) + [Environment]::NewLine
        [System.IO.File]::WriteAllText(
            (Join-Path $repositoryRoot $recordRelativePath),
            $recordContent,
            [System.Text.UTF8Encoding]::new($false)
        )

        $gitPaths = @($pathsToStage.ToArray()) + @($recordRelativePath)
        Invoke-Git -Arguments (@('add', '--') + $gitPaths)

        $formattedTimestamp = $timestamp.ToString('yyyy年MM月dd日 HH:mm:ss zzz')
        $subject = "自動提交：$formattedTimestamp"
        $messageLines = @(
            "提交時間：$formattedTimestamp",
            '變更摘要：自動提交本次檔案變更，方便依日期時間查詢。',
            '變更檔案：'
        )
        foreach ($path in $pathsToStage) {
            $messageLines += "- $path"
        }
        $message = $messageLines -join [Environment]::NewLine
        Invoke-Git -Arguments @('commit', '-m', $subject, '-m', $message)
        Invoke-Git -Arguments @('push', '--set-upstream', 'origin', $branch)
        Write-Host "已提交並推送 $($pathsToStage.Count) 個變更；紀錄：$recordRelativePath"
    }
}
finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    foreach ($sourceIdentifier in $sourceIdentifiers) {
        Unregister-Event -SourceIdentifier $sourceIdentifier -ErrorAction SilentlyContinue
    }
}
