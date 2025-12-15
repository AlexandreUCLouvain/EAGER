const AbstractDynamicRecognizer = require('../../../../framework/modules/recognizers/dynamic/abstract-dynamic-recognizer').AbstractDynamicRecognizer;
const { performance } = require('perf_hooks');

class Recognizer extends AbstractDynamicRecognizer {
	static name = "MajorityVoting";

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

	removeGesture(name) {
		this.recognizers.forEach((recognizer, index) => {
			if (isInTrainingSet(name, this.trainingGestures[index])) {
				recognizer.removeGesture(name);
			}
		});
	}

	recognize(sample) {console.log("here"); return undefined;
	}

	toString() {
    return `${Recognizer.name}`;
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

module.exports = Recognizer;