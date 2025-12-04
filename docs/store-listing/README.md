# Store Listing Assets

- Feature graphic (1024x500) will be generated here.

How to generate (PowerShell):

```
# 1) Установить optional dependency (sharp)
npm install --include=optional sharp --no-fund --no-audit

# 2) Сгенерировать
npm run generate:feature
# или c параметрами
powershell -ExecutionPolicy Bypass -File scripts/generate-feature-graphic.ps1 -Out docs/store-listing/feature-graphic.png -Width 1024 -Height 500 -BgStart "#3B82F6" -BgEnd "#8B5CF6" -LogoScale 0.7
```

Output:
- docs/store-listing/feature-graphic.png
- docs/store-listing/feature-graphic.jpg



