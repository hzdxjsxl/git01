const fs = require('fs');

function generateWindData(outputPath) {
    const data = [];
    
    const lonStep = 5;
    const latStep = 5;
    
    for (let lon = -180; lon <= 180; lon += lonStep) {
        for (let lat = -90; lat <= 90; lat += latStep) {
            const latRad = (lat * Math.PI) / 180;
            const lonRad = (lon * Math.PI) / 180;
            
            const jetStream = Math.exp(-Math.pow((lat - 45) / 15, 2)) * 30;
            
            const baseU = -10 + jetStream * Math.sin(lonRad * 2);
            const baseV = 5 + jetStream * Math.cos(lonRad * 2);
            
            const coriolis = Math.sin(latRad) * 5;
            const u = baseU + coriolis * Math.cos(lonRad);
            const v = baseV - coriolis * Math.sin(lonRad) - lat * 0.1;
            
            data.push({
                lon: lon,
                lat: lat,
                u: u,
                v: v
            });
        }
    }
    
    console.log(`Generated ${data.length} wind data points`);
    console.log(`Grid: ${(360 / lonStep) + 1} x ${(180 / latStep) + 1}`);
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Saved to ${outputPath}`);
}

generateWindData('w:\\ATraePro\\3\\wind-data.json');
