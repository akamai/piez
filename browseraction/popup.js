window.onload = function() {
	document.getElementById("piez-off").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-off"
		});
	};

	document.getElementById("piez-im-simple").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-im-simple"
		});
	};

	document.getElementById("piez-im-advanced").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-im-advanced"
		});
	};

	document.getElementById("piez-a2").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-a2"
		});
	};

	document.getElementById("piez-ro-simple").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-ro-simple"
		});
	};

	document.getElementById("piez-ro-advanced").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-ro-advanced"
		});
	};

	document.getElementById("piez-3pm").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-3pm"
		});
	};

	document.getElementById("save-data").onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-options",
			options: getOptions()
		});
	};

	document.getElementById('present-mode').onclick = function() {
		chrome.runtime.sendMessage({
			type: "piez-options",
			options: getOptions()
		})
	};

	let getOptions = function() {
		let allOptions = document.getElementsByClassName("piez-options");
		let checkedOptions = [];
		Array.from(allOptions).forEach((option) => {
			if (option.checked) {
				checkedOptions.push(option.value);
			}
		});
		return checkedOptions;
	};

	let setFormField = function(piezSettings) {
		chrome.storage.local.get("piezCurrentState", function(result) {
			document.getElementById(result["piezCurrentState"]).checked = true;
		});
		chrome.storage.local.get("piezCurrentOptions", function(options) {
			if(options["piezCurrentOptions"]) {
				options["piezCurrentOptions"].forEach((option) => {
					document.getElementById(option).checked = true;
				});
			}
		});
	};

	setFormField();
};