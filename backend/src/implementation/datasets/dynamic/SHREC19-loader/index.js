const path = require('path');
const fs = require('fs-extra');

const GestureSet = require('../../../../framework/gestures/gesture-set').GestureSet;
const GestureClass = require('../../../../framework/gestures/gesture-class').GestureClass;
const StrokeData = require('../../../../framework/gestures/stroke-data').StrokeData;
const { Path, Stroke } = require('../../../../framework/gestures/stroke-data');
const { Point2D, Point3D, PointND } = require('../../../../framework/gestures/Point');

function loadDataset(name, datasetPath, sensorId, datasetId, sensorPointsNames) {
    let gestureSet = new GestureSet(name);
    let dirPath = datasetPath;


    const folders = fs.readdirSync(dirPath)
        .filter(u => fs.lstatSync(path.join(dirPath, u)).isDirectory())
        .sort();

    if (folders.length === 0)
        throw new Error(`No folders found in ${dirPath}`);


    const firstFolder = path.join(dirPath, folders[0]);
    const gestureNames = fs.readdirSync(firstFolder)
        .filter(f => f.endsWith(".json"))
        .map(f => f.replace(".json", ""))
        .sort();

    let gestureClassIndexMap = {};
    gestureNames.forEach((gesture, idx) => {
        const fullName = addIdentifier(gesture, datasetId);
        const gestureClass = new GestureClass(fullName, idx);
        gestureClassIndexMap[gesture] = gestureClass;
        gestureSet.addGestureClass(gestureClass);
    });

    //Todo as 13 user made each 3 user from dataset a single user. But in the end hardcoded User1 as I do userIndependant
    const REPETITIONS_PER_USER = 3;

    folders.forEach((folderName, folderIndex) => {
        const folderPath = path.join(dirPath, folderName);

        const userIndex = Math.floor(folderIndex / REPETITIONS_PER_USER) + 1;
        const sampleIndex = (folderIndex % REPETITIONS_PER_USER) + 1;

        const USER_NAME =`User${userIndex}`;

        gestureNames.forEach(gesture => {
            const gestureFile = path.join(folderPath, `${gesture}.json`);
            if (!fs.existsSync(gestureFile)) return;

            const rawStrokeData = JSON.parse(fs.readFileSync(gestureFile));

            // Same signature as unified loader
            let strokeData = new StrokeData("User1", 1);

            Object.entries(rawStrokeData.paths).forEach(([pathLabel, pathContent]) => {
                const label = addIdentifier(pathLabel, sensorId);
                const pathObj = new Path(label);

                let stroke = new Stroke(0);

                pathContent.strokes.forEach(point => {
                    stroke.addPoint(new Point3D(point.x, point.y, point.z, point.t));
                });

                pathObj.addStroke(stroke);
                strokeData.addPath(label, pathObj);
            });

            gestureClassIndexMap[gesture].addSample(strokeData);
        });
    });
    return gestureSet;
}

function addIdentifier(name, identifier) {
    return identifier ? `${name}_${identifier}` : name;
}

module.exports = { loadDataset };