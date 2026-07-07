
$mysqlDir = "C:\xampp\mysql"
$dataDir = "$mysqlDir\data"
$backupDir = "$mysqlDir\backup"
$oldDataDir = "$mysqlDir\data_old_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "Stopping mysqld if it is running..."
taskkill /F /IM mysqld.exe 2>$null

Write-Host "Renaming current data directory to $oldDataDir..."
Rename-Item -Path $dataDir -NewName (Split-Path $oldDataDir -Leaf)

Write-Host "Copying backup directory to create a fresh data directory..."
Copy-Item -Path "$backupDir" -Destination $dataDir -Recurse -Force

Write-Host "Restoring your databases..."
$exclude = @("mysql", "performance_schema", "phpmyadmin")
Get-ChildItem -Path $oldDataDir -Directory | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Write-Host "Restoring database: $($_.Name)"
    Copy-Item -Path $_.FullName -Destination $dataDir -Recurse -Force
}

Write-Host "Restoring ibdata1..."
Copy-Item -Path "$oldDataDir\ibdata1" -Destination $dataDir -Force

Write-Host "=========================================================="
Write-Host "Repair complete! You can now start MySQL in XAMPP."
Write-Host "=========================================================="

