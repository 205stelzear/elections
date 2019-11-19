function setup_results(data) {
	
	if (data.dbPsw || data.dbPsw == undefined) {
		switch_view("pre-results-page", () => setup_pre_results_page(data));
	}
	else {
		switch_view("results-page", () => setup_results_page(data));
	}
	
}

function setup_pre_results_page(data) {
	
	// Default password if not set is "VL" for "Vieux-Loups"
	let passwordToCheck = data.dbPsw || "VL";
	
	const preResultsSubmitButton = document.getElementById("pre-results-submit-button");
	
	const passwordInput = document.getElementById("pre-results-password-input");
	
	preResultsSubmitButton.addEventListener("click", e => {
		e.preventDefault();
		
		const password = passwordInput.value;
		
		if (password == passwordToCheck) {
			
			switch_view("results-page", () => setup_results_page(data));
			
		}
		else {
			
			passwordInput.classList.add("is-invalid");
			preResultsSubmitButton.disabled = true;
			
		}
		
	});
	
	passwordInput.addEventListener("input", () => {
		
		passwordInput.classList.remove("is-invalid")
		preResultsSubmitButton.disabled = false;
		
	});
	
}

function setup_results_page(data) {
	
	const resultsTableBody = document.getElementById("results-body");
	
	const candidatesClone = JSON.parse(JSON.stringify(data.candidates));
	const sortedCandidates = candidatesClone.sort((a, b) => (a.voteCount > b.voteCount) ? -1 : ((b.voteCount > a.voteCount) ? 1 : 0));
	
	let tableBodyHtml = "";
	
	let countOfEqual = 0;
	let lastVoteCount = -1;
	
	sortedCandidates.forEach((candidate, i) => {
		
		if (lastVoteCount == candidate.voteCount) {
			countOfEqual++;
		}
		
		let candidateBackground = "";
		let candidateSelectedState = "unselected";
		
		switch (candidate.selectedState) {
			case "pre-selected":
				candidateBackground = " bg-warning";
				candidateSelectedState = "pre-selected";
				break;
			case "selected":
				candidateBackground = " bg-success";
				candidateSelectedState = "selected";
				break;
			default:
				candidateBackground = "";
				candidateSelectedState = "unselected";
				break;
		}
		
		tableBodyHtml += `
		<tr class="clickable-row${candidateBackground}" data-stateselected="${candidateSelectedState}" data-candidate="${candidate.name}">
			<th scope="row">${i + 1}</th>
			<td>${i + 1 - countOfEqual}</td>
			<td>${candidate.name}</td>
			<td>${candidate.voteCount}</td>
		</tr>`;
		
		lastVoteCount = candidate.voteCount;
		
	});
	
	$(resultsTableBody).append(tableBodyHtml);
	
	$(resultsTableBody).on("click", ".clickable-row", e => {
		
		const row = e.currentTarget;
		
		$(row).removeClass("bg-warning bg-success");
		
		let candidateState = "problem (not changed)";
		
		if (row.dataset.stateselected == "unselected") {
			
			$(row).toggleClass("bg-warning");
			candidateState = "pre-selected";
			
		}
		else if (row.dataset.stateselected == "pre-selected") {
			
			$(row).toggleClass("bg-success");
			candidateState = "selected";
			
		}
		else if (row.dataset.stateselected == "selected") {
			
			candidateState = "unselected";
			
		}
		
		row.dataset.stateselected = candidateState;
		
		const candidateObject = data.candidates.find(candidate => candidate.name == row.dataset.candidate);
		
		candidateObject.selectedState = candidateState;
		
		dbIsDirty = true;
		
	});
	
	const downloadDbButton = document.getElementById("results-download-button");
	
	downloadDbButton.addEventListener("click", e => {
		e.preventDefault();
		
		download_data(data);
	});
	
	const homepageButton = document.getElementById("results-homepage-button");
	
	homepageButton.addEventListener("click", () => {
		
		let canReload = true;
		
		if (should_download_data()) {
			
			canReload = confirm("La base de données n'est pas enregistrée. Êtes vous sûr de vouloir continuer?");
			
		}
		
		if (canReload) {
			
			window.removeEventListener("beforeunload", auto_download_data);
			
			isDownloadDisabled = true;
			document.location.reload(true);
			
		}
		
	});
	
}
