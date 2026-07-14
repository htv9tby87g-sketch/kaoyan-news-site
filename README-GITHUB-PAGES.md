# Free Cloud Publishing

This project can run without the local computer after it is placed in a public GitHub repository and GitHub Pages is enabled.

## What runs in the cloud

- GitHub Actions checks every 15 minutes for released reports missing from the previous 14 days.
- Cloud generation prioritizes official RSS feeds to reduce data-center rate limiting.
- Opening the desktop shortcut runs the same recovery locally and pushes any missing archives.
- Each generated JSON file is final. A later run reads the existing file instead of replacing it.
- GitHub Pages publishes the static `dist` folder, so readers only fetch final JSON files.

## First setup in GitHub

1. Create a **public** GitHub repository.
2. Upload this project to its default branch.
3. Open the repository's **Settings > Pages** and choose **GitHub Actions** as the deployment source.
4. Open **Actions**, select **Generate and publish news archive**, and run it once manually for the morning report. This verifies that the source sites are reachable from GitHub's runner.
5. The Pages settings page will show the permanent website address after the first successful deployment.

## Local commands

```powershell
node scripts\prepare-published-data.mjs
node generate-report.mjs --edition morning --prepare
node scripts\build-static-site.mjs
```

The desktop shortcut runs `scripts\local-catchup.ps1 -OpenBrowser`. It opens the
public site immediately, checks for missing released reports in the background,
and pushes finalized archives through the existing Git credentials.

The local `data/news` directory remains a backup. Only finalized files in `published-data/news` are included in the public static website.
