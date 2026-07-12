# Free Cloud Publishing

This project can run without the local computer after it is placed in a public GitHub repository and GitHub Pages is enabled.

## What runs in the cloud

- GitHub Actions prepares the morning report at 06:45 Beijing time and the evening report at 20:45 Beijing time.
- Retry jobs run at 07:15 and 21:15 Beijing time.
- A daily recovery job checks the previous 14 days for missing archives.
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

The local `data/news` directory remains a backup. Only finalized files in `published-data/news` are included in the public static website.
