mkdir -p .github/workflows
git mv workflows/build-windows-exe.yml .github/workflows/
git commit -m "move workflow to correct GitHub Actions directory"
git push
