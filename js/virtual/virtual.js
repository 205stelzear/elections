import ElectionData from '../election-data.js';
import Requester from '../my-libs/requester.js';
import switchView from '../switcher.js';
import Utils from '../utils/utilities.js';
import { VotingSession } from '../voting-session.js';
import Cookies from '../libraries/js.cookie.min.mjs';
import { setupResults } from './virtual-results.js';

const urlParams = new URLSearchParams(window.location.search);

const isAdmin = urlParams.get('as') == 'admin';

const loadingMainText = document.getElementById('loading-main-text');

function setupVirtualElection() {
    if (!urlParams.has('code')) {
        const noCodeErrorText = document.getElementById('no-code-error');
        
        noCodeErrorText.hidden = false;
    } else {
        const virtualElectionCode = urlParams.get('code');
        
        setupVoter(virtualElectionCode);
    }
}

/**
 *
 * @param {string} virtualElectionCode
 * @param {'join' | 'retrieve'} path
 * @param {Partial<import('../my-libs/requester.js').RequestOptions> | string} [requestOptions]
 */
export function requestElectionData(virtualElectionCode, path, requestOptions) {
    const additionalQueries = { ...(isAdmin && {admin: true}) };
    
    return Requester.sendRequest({
        url: Requester.url(`${Utils.sharedElectionHostRoot}/virtual/${path}`, { code: virtualElectionCode, ...additionalQueries }),
        contentType: 'application/javascript',
    }, requestOptions);
}

/**
 *
 * @param {string} virtualElectionCode
 */
async function setupVoter(virtualElectionCode) {
    const electionCookie = Cookies.get(`election_${virtualElectionCode}`);
    
    if (!isAdmin && electionCookie) {
        loadingMainText.innerText = 'Vous avez déjà voté pour cette élection! Merci! :)';
    } else {
        try {
            const response = await requestElectionData(virtualElectionCode, 'join', {
                requesterContainer: 'home-loading-requester-container',
                minimumRequestDelay: 500,
            });
            
            handleJoinSuccessResponse(response, virtualElectionCode);
        } catch (error) {
            if (error.status == 400) {
                const nonExistingCodeErrorText = document.getElementById('non-existing-code-error');
                
                nonExistingCodeErrorText.hidden = false;
            } else {
                const serverErrorText = document.getElementById('server-error');
                
                serverErrorText.hidden = false;
            }
        }
    }
}

/**
 * @param {*} response
 * @param {string} virtualElectionCode
 */
function handleJoinSuccessResponse(response, virtualElectionCode) {
    Utils.isServerAccessible = true;
    
    if (response.isElectionFinished && !response.data) {
        const electionEndedWarningText = document.getElementById('election-ended-warning');
        
        loadingMainText.hidden = true;
        electionEndedWarningText.hidden = false;
    } else {
        const data = ElectionData.fromJSON(response.data);
        
        data.setSharedElectionCode(virtualElectionCode);
        
        if (isAdmin) {
            setupResults(data);
        } else {
            switchView('voting-page', () => setupVirtualVotingSession(data));
        }
    }
}

function addLoaderElementToVotingPage() {
    const votingSubmitButtonDiv = document.getElementById('voting-submit-button-div');
    
    votingSubmitButtonDiv.classList.add('d-flex', 'flex-row');
    
    const requesterLoaderHtml = `
    <div id="voting-sending-votes-requester-container" class="requester-container align-self-center ml-3" hidden>
        <div class="requester-spinner spinner-border" role="status">
            <span class="sr-only">Chargement...</span>
        </div>
    </div>`;
    
    $(votingSubmitButtonDiv).append(requesterLoaderHtml);
    
    const votingUnderSubmitButtonDiv = document.getElementById('voting-under-submit-button-div');
    
    const errorSubmitMessageHtml = `
    <span class="h4 text-danger">Une erreur est survenue lors de l'envoi des votes aux serveurs, veuillez réessayer!</span>`;
    
    $(votingUnderSubmitButtonDiv).append(errorSubmitMessageHtml);
    
    votingUnderSubmitButtonDiv.classList.add('text-center', 'mt-2');
}

/**
 *
 * @param {ElectionData} data
 */
function setupVirtualVotingSession(data) {
    const votingSession = new VotingSession(data);
    
    votingSession.initializeVotingComponents();
    
    addLoaderElementToVotingPage();
    
    const submitVotesButton = /** @type {HTMLButtonElement} */ (document.getElementById('voting-submit-button'));
    
    const votingOverlay = document.getElementById('voting-voted-overlay');
    
    submitVotesButton.addEventListener('click', async () => {
        submitVotesButton.disabled = true;
        
        const votingUnderSubmitButtonDiv = document.getElementById('voting-under-submit-button-div');
        
        votingUnderSubmitButtonDiv.hidden = true;
        
        const candidatesData = {
            candidates: data.votesCurrentCandidateIndexes
        };
        
        const candidatesIndexesJSON = JSON.stringify(candidatesData);
        
        const requestContainer = 'voting-sending-votes-requester-container';
        
        try {
            await Requester.sendRequest({
                type: 'PATCH',
                url: Requester.url(`${Utils.sharedElectionHostRoot}/virtual/vote`, { code: data.sharedElectionCode }),
                data: candidatesIndexesJSON,
                cache: false,
            }, {
                requesterContainer: requestContainer,
                minimumRequestDelay: 500,
                doLingerSpinner: true
            });
            
            votingOverlay.classList.add('active');
                
            Cookies.set(`election_${data.sharedElectionCode}`, 'true', {expires: 14});
        } catch (_error) {
            Requester.hideLoader(requestContainer);
            
            votingUnderSubmitButtonDiv.hidden = false;
            submitVotesButton.disabled = false;
        }
    });
}

const fragmentLoader = document.querySelector('include-fragment');

fragmentLoader.addEventListener('load', () => {
    Utils.init();
    
    setupVirtualElection();
});
