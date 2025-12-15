const AbstractDynamicRecognizer = require('../../../../framework/modules/recognizers/dynamic/abstract-dynamic-recognizer').AbstractDynamicRecognizer;
const { performance } = require('perf_hooks');
const { parsePointsNames } = require('../../../../framework/utils');

class Recognizer extends AbstractDynamicRecognizer {
	static name = "Dirichlet";

    constructor(options, dataset) {
    super();
	this.trainingGestures = [];
    this.recognizers = [];
    this.weights = [];
		options.recognizers.forEach(recognizer => {
			this.trainingGestures.push(recognizer.additionalSettings.trainingGestures);
			this.recognizers.push(new recognizer.module(recognizer.moduleSettings));
			this.weights.push(recognizer.additionalSettings.weight);
		});
		if (dataset !== undefined) {
			dataset.getGestureClasses().forEach((gesture) => {
				gesture.getSamples().forEach(sample => {
					this.addGesture(gesture.name, sample);
				}
				);
			});
		}
	}

    
	addGesture(name, sample) {
		this.recognizers.forEach((recognizer, index) => {
			if (isInTrainingSet(name, this.trainingGestures[index])) {
				recognizer.addGesture(name, sample);
			}
		});
	}

    recognize(sample){
        const distribution = [];
        let totalTime = 0;


        for(const recognizer of this.recognizers){
            const allSimilarities = recognizer.recognizeAllSimilarities(sample);
            totalTime += allSimilarities.time;

            distribution.push(this.normalize(allSimilarities.similarities));
        }

        //Set the alpha param
        const alpha = this.weights.map(w => w ?? 1.0);

        //Set the weights for recogniser
        const w = this.sampleDirichlet(alpha);


        //console.log("This is w: "+w);
        //console.log("This is the distribution : ",distribution[0]);

        const classScores = {};

        for (let i = 0; i < distribution.length; i++){
            const probs = distribution[i];
            for(const className in probs){
                if(!classScores[className]){
                    classScores[className] = 0;
                }
                classScores[className] += w[i] * probs[className];
            }
        }

        let bestClass ="";
        let bestScore = -Infinity;

        for (const className in classScores){
            if(classScores[className] > bestScore){
                bestScore = classScores[className];
                bestClass = className;
            }
        }

        if(bestClass === ""){
            return {name: "", score: 0.0, time: totalTime};
        }

        return {name: bestClass,
                score: bestScore,
                time: totalTime
        };
    }

    normalize(similarities){
        const probs = {};
        let sum = 0;

        for(const c in similarities){
            sum += similarities[c]
        }

        if(sum === 0){
            const n = Object.keys(similarities).length;
            for(const c in similarities) {
                probs[c] = 1/n;
            }
            return probs
        }

        for(const c in similarities) {
            probs[c] = similarities[c] / sum;
        }

        return probs;

    }

    sampleGamma(alpha) {
        let d, c, x, v, u;
        //Todo check if other value start for alpha has a better impact
       alpha += 1;
        d = alpha - 1 / 3;
        c = 1 / Math.sqrt(9 * d);
        while (true) {
            do {
                x = Math.random();
                v = Math.pow(1 + c * (Math.log(x / (1 - x))), 3);
            } while (v <= 0);
            u = Math.random();
            if (u < 1 - 0.0331 * Math.pow(x, 4)) return d * v;
            if (Math.log(u) < 0.5 * Math.pow(x, 2) + d * (1 - v + Math.log(v)))
                return d * v;
        }
    }

    sampleDirichlet(alpha){
        const samples = alpha.map(a => this.sampleGamma(a));
        const sum = samples.reduce((a,b) => a + b, 0);
        return samples.map(v => v / sum);
    }


	removeGesture(name) {
		this.recognizers.forEach((recognizer, index) => {
			if (isInTrainingSet(name, this.trainingGestures[index])) {
				recognizer.removeGesture(name);
			}
		});
	}
    
    toString() {
    return ("",this.recognizers.map(r >= r.toString()).join(","));
  }
}

function isInTrainingSet(gesture, trainingSet) {
	if (trainingSet === undefined || trainingSet === null || trainingSet.length === 0) {
		// Keep all gestures
		return true;
	} else {
		// Keep only gestures in the training set
		return trainingSet.indexOf(gesture) !== -1;
	}
}

function convert(sample, selectedPoints) {
	let points = [];
	selectedPoints.forEach((articulation, articulationID) => {
		sample.paths[articulation].strokes.forEach((stroke, strokeId) => {
			stroke.points.forEach((point) => {
				// If multipoint, one stroke per articulation, otherwise, keep original strokes
				let index = selectedPoints.length > 1 ? articulationID : strokeId;
				points.push(new Point(point.x, point.y, point.z, index));
			});
		});
	});
	return points;
}

module.exports = Recognizer;