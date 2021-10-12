import ElectionData from './election-data.js'; //eslint-disable-line no-unused-vars
import Requester from './my-libs/requester.js';
import switchView from './switcher.js';
import Utils from './utils/utilities.js';
import { autoDownloadData } from './voting.js';

/**
 *
 * @param {ElectionData} data
 * @param {boolean} [didSkipRemainings]
 */
export function setupPostVoting(data, didSkipRemainings) {
    Utils.initializeImages('post-shared-voting-page', data.groupImage);
    
    const sharedPostVoteButtonVerify = /** @type {HTMLButtonElement} */ (document.getElementById('shared-post-votes-verify'));
    const sharedPostVoteButtonGo = /** @type {HTMLButtonElement} */ (document.getElementById('shared-post-votes-go'));
    const sharedPostVoteButtonGoAndDelete = /** @type {HTMLButtonElement} */ (document.getElementById('shared-post-votes-go-and-delete'));
    
    const sharedPostVoteFinishedIcon = document.getElementById('post-shared-voting-verify-finished-icon');
    const sharedPostVoteNotFinishedIcon = document.getElementById('post-shared-voting-verify-not-finished-icon');
    
    let autoClickVerifyTimerSeconds = 30;
    const sharedPostVerifyAutoClickTimer = document.getElementById('shared-post-verify-auto-click-timer');
    
    /**
     *
     * @param {number} count
     */
    function resetAutoClickVerifyTimer(count) {
        autoClickVerifyTimerSeconds = count;
        
        sharedPostVerifyAutoClickTimer.textContent = ` (${autoClickVerifyTimerSeconds})`;
        
        const intervalId = setInterval(() => {
            sharedPostVerifyAutoClickTimer.textContent = ` (${--autoClickVerifyTimerSeconds})`;
            
            if (autoClickVerifyTimerSeconds <= 0) {
                clearInterval(intervalId);
                
                sharedPostVoteButtonVerify.dispatchEvent(new Event('click'));
            }
        }, 1000);
        
        return intervalId;
    }
    
    let autoClickVerifyTimer = undefined;
    
    const sharedPostVotesSkippedErrorDiv = document.getElementById('post-shared-voting-skipped-error-div');
    const sharedPostVotesSkippedErrorSpan = sharedPostVotesSkippedErrorDiv.querySelector('.text-danger.dynamic-error');
    
    const errorInternetErrorMessage = 'Une erreur de requête est survenue, veuillez vérifier votre accès Internet ou utilisez l\'option de voir les résultats localement!';
    
    /**
     * @param {ElectionData} data
     */
    function handleVerificationDisabling(data) {
        const didAllVoted = data.numberOfVoted == data.numberOfVoters;
        const didSkippedAllSeatTakenVoted = data.hasSkipped && data.numberOfVoted == (data.numberOfSeatsTaken - 1);
        
        const isAllVotesDone = didAllVoted || didSkippedAllSeatTakenVoted;
        
        sharedPostVoteButtonVerify.disabled = isAllVotesDone;
        sharedPostVoteButtonGo.disabled = !isAllVotesDone;
        sharedPostVoteButtonGoAndDelete.disabled = !isAllVotesDone;
        
        clearInterval(autoClickVerifyTimer);
        
        if (isAllVotesDone) {
            sharedPostVoteFinishedIcon.hidden = false;
            
            sharedPostVerifyAutoClickTimer.hidden = true;
        } else {
            sharedPostVoteNotFinishedIcon.hidden = false;
            
            autoClickVerifyTimer = resetAutoClickVerifyTimer(30);
        }
        
        if (data.hasSkipped) {
            sharedPostVotesSkippedErrorDiv.hidden = false;
            
            /** @type {string} */
            let message = undefined;
            
            if (isAllVotesDone) {
                message = `Tout les autres électeurs ont terminés de voter. L'élection fut arrêtée mais ${data.numberOfVoters - data.numberOfVoted} électeur(s) furent sautés.`;
            } else {
                const info = didSkipRemainings ? 'Aucun autre électeur ne pourras exécuter son vote sauf ceux déjà en cours' : 'Un autre appareil a exécuter la commande pour sauter les derniers électeurs! Aucune autre place n\'est disponible';
                
                message = `${info} : en attente des autres appareils où des électeurs sont présentement en train de voter...`;
            }
            
            sharedPostVotesSkippedErrorSpan.textContent = `${message}`;
        }
    }
    
    handleVerificationDisabling(data);
    
    const sharedPostVoteButtonSkipWait = document.getElementById('shared-post-votes-skip-wait');
    
    sharedPostVoteButtonSkipWait.addEventListener('click', () => {
        clearInterval(autoClickVerifyTimer);
        
        setupResults(data);
        
        Utils.uninitializeImages('voting-page');
    });
    
    sharedPostVoteButtonVerify.addEventListener('click', async () => {
        sharedPostVoteFinishedIcon.hidden = true;
        $(sharedPostVoteNotFinishedIcon).popover('hide');
        sharedPostVoteNotFinishedIcon.hidden = true;
        
        sharedPostVoteButtonVerify.disabled = true;
        clearInterval(autoClickVerifyTimer);
        
        const sharedPostVotesVerifyErrorSpan = document.getElementById('shared-post-votes-verify-error-span');
        
        try {
            sharedPostVotesVerifyErrorSpan.hidden = true;
            
            const response = await Requester.sendRequest({
                url: Requester.url(`${Utils.sharedElectionHostRoot}/retrieve`, { code: data.sharedElectionCode }),
                cache: false,
            }, {
                requesterContainer: 'post-shared-voting-verify-requester-container',
                // doHideContainerOnEnd: false,
            });
            
            const fetchedElection = ElectionData.fromJSON(response.data);
            
            data.mergeData(fetchedElection);
        } catch (error) {
            const messageToShow = error.status == 400 ? `Le code ${data.sharedElectionCode} n'est pas sur le serveur. Un autre appareil a probablement déjà supprimer les données du serveur! Vous pouvez cependant utiliser l'option de voir les résultats localement.` : errorInternetErrorMessage;
            
            sharedPostVotesVerifyErrorSpan.textContent = messageToShow;
            sharedPostVotesVerifyErrorSpan.hidden = false;
        }
        
        handleVerificationDisabling(data);
    });
    
    sharedPostVoteButtonGo.addEventListener('click', async () => {
        sharedPostVoteButtonGo.disabled = true;
        
        const sharedPostVotesGoErrorSpan = document.getElementById('shared-post-votes-go-error-span');
        
        try {
            sharedPostVotesGoErrorSpan.hidden = true;
            
            const response = await Requester.sendRequest({
                url: Requester.url(`${Utils.sharedElectionHostRoot}/retrieve`, { code: data.sharedElectionCode }),
                cache: false,
            }, 'post-shared-votes-go-requester-container');
            
            const fetchedElection = ElectionData.fromJSON(response.data);
            
            data.mergeData(fetchedElection);
            
            setupResults(data);
            
            Utils.uninitializeImages('voting-page');
        } catch (error) {
            const messageToShow = error.status == 400 ? `Le code ${data.sharedElectionCode} n'est pas sur le serveur. Un autre appareil a probablement déjà supprimer les données du serveur! Vous pouvez cependant utiliser l'option de voir les résultats localement.` : errorInternetErrorMessage;
            
            sharedPostVotesGoErrorSpan.textContent = messageToShow;
            sharedPostVotesGoErrorSpan.hidden = false;
        }
        
        sharedPostVoteButtonGo.disabled = false;
    });
    
    sharedPostVoteButtonGoAndDelete.addEventListener('click', async () => {
        sharedPostVoteButtonGoAndDelete.disabled = true;
        
        const sharedPostVotesGoAndDeleteErrorSpan = document.getElementById('shared-post-votes-go-and-delete-error-span');
        
        try {
            sharedPostVotesGoAndDeleteErrorSpan.hidden = true;
            
            const response = await Requester.sendRequest({
                type: 'DELETE',
                url: Requester.url(`${Utils.sharedElectionHostRoot}`, { code: data.sharedElectionCode }),
                cache: false,
            }, 'post-shared-votes-go-and-delete-requester-container');
            
            const fetchedElection = ElectionData.fromJSON(response.data);
            
            data.mergeData(fetchedElection);
            
            setupResults(data);
            
            Utils.uninitializeImages('voting-page');
        } catch (error) {
            const messageToShow = error.status == 400 ? `Le code ${data.sharedElectionCode} n'est pas sur le serveur. Un autre appareil a probablement déjà supprimer les données du serveur! Vous pouvez cependant utiliser l'option de voir les résultats localement.` : errorInternetErrorMessage;
            
            sharedPostVotesGoAndDeleteErrorSpan.textContent = messageToShow;
            sharedPostVotesGoAndDeleteErrorSpan.hidden = false;
        }
        
        sharedPostVoteButtonGoAndDelete.disabled = false;
    });
}

/**
 *
 * @param {ElectionData} data
 * @param {boolean} [didSkipRemainings]
 */
export function setupResults(data, didSkipRemainings) {
    if (data.dbPsw || data.dbPsw == undefined) {
        switchView('pre-results-page', () => setupPreResultsPage(data, didSkipRemainings));
    } else {
        switchView('results-page', () => setupResultsPage(data, didSkipRemainings));
    }
}

/**
 *
 * @param {ElectionData} data
 * @param {boolean} [didSkipRemainings]
 */
export function setupPreResultsPage(data, didSkipRemainings) {
    Utils.initializeImages('pre-results-page', data.groupImage);
    
    const preResultsSubmitButton = /** @type {HTMLButtonElement} */ (document.getElementById('pre-results-submit-button'));
    
    const passwordInput = /** @type {HTMLInputElement} */ (document.getElementById('pre-results-password-input'));
    
    preResultsSubmitButton.addEventListener('click', e => {
        e.preventDefault();
        
        const password = passwordInput.value;
        
        if (data.validatePassword(password)) {
            switchView('results-page', () => setupResultsPage(data, didSkipRemainings));
            
            Utils.uninitializeImages('pre-results-page');
        } else {
            passwordInput.classList.add('is-invalid');
            preResultsSubmitButton.disabled = true;
        }
    });
    
    passwordInput.addEventListener('input', () => {
        passwordInput.classList.remove('is-invalid');
        preResultsSubmitButton.disabled = false;
    });
}

/**
 * @param {ElectionData} data
 * @param {boolean} [_didSkipRemainings]
 */
export function setupResultsPage(data, _didSkipRemainings) {
    Utils.initializeImages('results-page', data.groupImage);
    
    const resultsTableBody = document.getElementById('results-body');
    
    const candidatesClone = JSON.parse(JSON.stringify(data.candidates));
    const sortedCandidates = candidatesClone.sort((a, b) => ((a.voteCount > b.voteCount) ? -1 : ((b.voteCount > a.voteCount) ? 1 : 0)));
    
    let tableBodyHtml = '';
    
    let countOfEqual = 0;
    let lastVoteCount = -1;
    
    sortedCandidates.forEach((candidate, i) => {
        if (lastVoteCount == candidate.voteCount) {
            countOfEqual++;
        }
        
        let candidateBackground = '';
        let candidateSelectedState = 'unselected';
        
        switch (candidate.selectedState) {
        case 'pre-selected':
            candidateBackground = ' bg-warning';
            candidateSelectedState = 'pre-selected';
            break;
        case 'selected':
            candidateBackground = ' bg-success';
            candidateSelectedState = 'selected';
            break;
        default:
            candidateBackground = '';
            candidateSelectedState = 'unselected';
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
    
    $(resultsTableBody).on('click', '.clickable-row', async e => {
        const row = /** @type {HTMLTableRowElement} */ (e.currentTarget);
        
        $(row).removeClass('bg-warning bg-success');
        
        /** @type {'unselected' | 'pre-selected' | 'selected'} */
        let candidateState = 'unselected';
        
        if (row.dataset.stateselected == 'unselected') {
            $(row).toggleClass('bg-warning');
            candidateState = 'pre-selected';
        } else if (row.dataset.stateselected == 'pre-selected') {
            $(row).toggleClass('bg-success');
            candidateState = 'selected';
        } else if (row.dataset.stateselected == 'selected') {
            candidateState = 'unselected';
        }
        
        row.dataset.stateselected = candidateState;
        
        const candidateObject = data.candidates.find(candidate => candidate.name == row.dataset.candidate);
        
        candidateObject.selectedState = candidateState;
        
        Utils.dbIsDirty = true;
        
        if (data.sharedElectionCode) {
            const jsonCandidate = JSON.stringify({ data: candidateObject });
            
            try {
                await Requester.sendRequest({
                    type: 'PATCH',
                    url: Requester.url(`${Utils.sharedElectionHostRoot}/update-candidate`, { code: data.sharedElectionCode }),
                    data: jsonCandidate,
                    cache: false,
                }, {minimumRequestDelay: 0});
            } catch (error) {
                console.error(`Couldn't update table data in server. Ah well. Error object :`, error);
            }
        }
    });
    
    const legendToggler = /** @type {HTMLLinkElement} */ (document.querySelector('a[data-toggle=\'collapse\'][data-target=\'#results-click-explications\']'));
    
    $('#results-click-explications').on('hidden.bs.collapse', function () {
        legendToggler.textContent = 'Plus';
    });
    $('#results-click-explications').on('hide.bs.collapse show.bs.collapse', function () {
        legendToggler.textContent = '';
    });
    $('#results-click-explications').on('shown.bs.collapse', function () {
        legendToggler.textContent = 'Moins';
    });
    
    const downloadDbButton = document.getElementById('results-download-button');
    
    downloadDbButton.addEventListener('click', e => {
        e.preventDefault();
        
        Utils.downloadData(data.getAsJSON({ excludeCode: true }));
    });
    
    const homepageButton = document.getElementById('results-homepage-button');
    
    homepageButton.addEventListener('click', () => {
        let canReload = true;
        
        if (Utils.shouldDownloadData()) {
            canReload = confirm('La base de données n\'est pas enregistrée. Êtes vous sûr de vouloir continuer?');
        }
        
        if (canReload) {
            window.removeEventListener('beforeunload', autoDownloadData);
            
            Utils.isDownloadDisabled = true;
            location.reload();
        }
    });
}
