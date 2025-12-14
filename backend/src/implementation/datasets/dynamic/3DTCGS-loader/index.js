const path = require('path');
const fs = require('fs-extra');

const GestureSet = require('../../../../framework/gestures/gesture-set').GestureSet;
const GestureClass = require('../../../../framework/gestures/gesture-class').GestureClass;
const StrokeData = require('../../../../framework/gestures/stroke-data').StrokeData;
const { Path, Stroke } = require('../../../../framework/gestures/stroke-data');
const { Point3D } = require('../../../../framework/gestures/Point');

function loadDataset(name, datasetPath, sensorId, datasetId) {

    let gestureSet = new GestureSet(name);
    let users = fs.readdirSync(datasetPath)
                  .filter(f => fs.lstatSync(path.join(datasetPath, f)).isDirectory())
                  .sort();

    let firstUser = path.join(datasetPath, users[0]);
    let gestureNames = fs.readdirSync(firstUser)
                         .filter(f => f.endsWith('.csv'))
                         .map(f => f.replace('.csv',''))
                         .sort();

    let gestureMap = {};
    gestureNames.forEach((gesture, index) => {
        const fullName = datasetId ? `${gesture}_${datasetId}` : gesture;
        const gc = new GestureClass(fullName, index);
        gestureMap[gesture] = gc;
        gestureSet.addGestureClass(gc);
    });

    let globalSampleId = 1;

    // Load samples
    users.forEach((userFolder) => {
        const folderPath = path.join(datasetPath, userFolder);

        gestureNames.forEach(gesture => {
            const csvPath = path.join(folderPath, `${gesture}.csv`);
            if (!fs.existsSync(csvPath)) return;

            const rows = fs.readFileSync(csvPath, 'utf8')
                           .split(/\r?\n/)
                           .map(line => line.trim())
                           .filter(line => line.length > 0);

            const strokeData = new StrokeData("User1", 1);

            const label = "Palm_default";
            const pathObj = new Path(label);
            const stroke = new Stroke(0);
            rows.forEach(line => {
                const cols = line.split(/\s+/);

                if (cols.length < 3) return;

                const x = parseFloat(cols[0]);
                const y = parseFloat(cols[1]);
                const z = parseFloat(cols[2]);
                const t = cols[3] ? parseFloat(cols[3]) : 0;

                if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
                    console.warn("Skipping invalid row:", cols);
                    return;
                }

                stroke.addPoint(new Point3D(x, y, z, t));
            });

            pathObj.addStroke(stroke);
            strokeData.addPath(label, pathObj);

            gestureMap[gesture].addSample(strokeData);
        });
    });
    return gestureSet;
}

module.exports = { loadDataset };
