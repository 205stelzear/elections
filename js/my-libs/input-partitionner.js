/**
 *
 * @param {HTMLElement} inputRoot
 */
function getInputsFromRoot(inputRoot) {
    function getInputsWithoutHidden() {
        return /** @type {NodeListOf<HTMLInputElement>} */ (inputRoot.querySelectorAll('input[type]:not([type=\'hidden\'])'));
    }
    
    let currentInputs = getInputsWithoutHidden();
    
    if (inputRoot.hasAttribute('data-length')) {
        const inputTemplate = inputRoot.querySelector('input');
        
        const inputsLength = parseInt(inputRoot.getAttribute('data-length'));
        
        if (currentInputs.length != inputsLength) {
            inputRoot.innerHTML = '';
            
            for (let i = 0; i < inputsLength; i++) {
                inputRoot.appendChild(inputTemplate.cloneNode(true));
            }
            
            currentInputs = getInputsWithoutHidden();
        }
    }
    
    return currentInputs;
}

/**
 * @param {HTMLElement} inputRoot
 */
function getHiddenInputId(inputRoot) {
    return inputRoot.hasAttribute('data-hidden-input-id')
        ? inputRoot.getAttribute('data-hidden-input-id')
        : 'partitionned-input'.concat(inputRoot.id ? '-'.concat(inputRoot.id) : '');
}

/**
 * @param {HTMLInputElement} input
 * @param {string | any[]} content
 */
function setContentFromInput(input, content) {
    let didChangeValue = false;
    
    for (let i = 0, currentInput = input; currentInput && i < content.length; i++) {
        let currentChar = content[i];
        
        const inputPattern = currentInput.getAttribute('pattern');
        
        if (inputPattern) {
            const patternRegex = new RegExp('^'.concat(inputPattern, '$'));
            
            while (!patternRegex.test(currentChar)) {
                if (++i >= content.length) {
                    currentChar = '';
                    break;
                }
                
                currentChar = content[i];
            }
        }
        
        if (currentChar) {
            currentInput.value = currentChar;
            didChangeValue = true;
        }
        
        currentInput = /** @type {HTMLInputElement} */ (currentInput.nextElementSibling);
        
        if (currentInput) {
            currentInput.focus();
        }
    }
    
    return didChangeValue;
}

/**
 *
 * @param {HTMLElement} inputRoot
 */
function clearInputsOfRoot(inputRoot) {
    const inputs = getInputsFromRoot(inputRoot);
    
    inputs.forEach(input => input.value = '');
    
    updateHiddenInputValueFromRoot(inputRoot);
}

/**
 * @param {HTMLElement} inputRoot
 */
function updateHiddenInputValueFromRoot(inputRoot) {
    return updateHiddenInputValueFromInputs(inputRoot.querySelectorAll('input[type]:not([type=\'hidden\'])'), inputRoot.querySelector('input[type=\'hidden\']'));
}

/**
 * @param {Iterable<any> | ArrayLike<any>} inputs
 * @param {HTMLInputElement} hiddenInput
 */
function updateHiddenInputValueFromInputs(inputs, hiddenInput) {
    const prevVal = hiddenInput.value;
    const newVal = Array.from(inputs).map(input => input.value).join('');
    
    if (prevVal != newVal) {
        hiddenInput.value = newVal;
        
        hiddenInput.dispatchEvent(new Event('input'));
    }
}

export class InputPartitionLoader {
    /**
     *
     * @param {NodeListOf<HTMLInputElement>} inputRoots
     */
    init(inputRoots) {
        Array.from(inputRoots).forEach(inputRoot => {
            const inputs = getInputsFromRoot(inputRoot);
            
            const hiddenInputValue = document.createElement('input');
            
            hiddenInputValue.setAttribute('type', 'hidden');
            
            const hiddenInputId = getHiddenInputId(inputRoot);
            
            hiddenInputValue.setAttribute('id', hiddenInputId);
            
            inputRoot.appendChild(hiddenInputValue);
            
            inputs.forEach(input => {
                input.setAttribute('data-partition-for-id', hiddenInputId);
                input.setAttribute('maxlength', '1');
            });
            
            function updateHiddenInputValue() {
                updateHiddenInputValueFromInputs(inputs, hiddenInputValue);
            }
            
            inputs.forEach(input => {
                // Mobile fix
                input.addEventListener('input', /** @param {InputEvent} e */ e => {
                    if (e.inputType == 'deleteContentBackward' || (e.inputType == 'insertCompositionText' && !e.data)) {
                        input.value = '';
                        
                        const prevSibling = /** @type {HTMLElement} */ (input.previousElementSibling);
                        
                        if (prevSibling) {
                            prevSibling.focus();
                        }
                    } else if (e.inputType == 'insertCompositionText' || e.inputType == 'insertText') {
                        let canGoToNext = true;
                        
                        const inputPattern = input.getAttribute('pattern');
                        
                        if (inputPattern) {
                            const charInput = e.data.length == 2 ? e.data.charAt(1) : e.data;
                            const prevValue = e.data.length == 2 ? e.data.charAt(0) : '';
                            
                            const patternRegex = new RegExp('^'.concat(inputPattern, '$'));
                            
                            const doReplace = input.hasAttribute('data-do-replace') && input.getAttribute('data-do-replace') == 'true';
                            
                            if (!patternRegex.test(charInput)) {
                                canGoToNext = false;
                                input.value = prevValue;
                            }
                            
                            if (canGoToNext && doReplace) {
                                input.value = charInput;
                            }
                        }
                        
                        if (canGoToNext) {
                            const sibling = /** @type {HTMLElement} */ (input.nextElementSibling);
                            
                            if (sibling && !sibling.hasAttribute('hidden')) {
                                sibling.focus();
                            }
                        }
                    }
                    
                    updateHiddenInputValue();
                });
                
                // Actual keyboard and semi mobile behavior
                input.addEventListener('keyup', () => {
                    updateHiddenInputValue();
                });
                
                input.addEventListener('keypress', e => {
                    const inputPattern = input.getAttribute('pattern');
                    
                    if (inputPattern) {
                        const charInput = e.key || String.fromCharCode(e.keyCode);
                        
                        const patternRegex = new RegExp('^'.concat(inputPattern, '$'));
                        
                        const doReplace = input.hasAttribute('data-do-replace') && input.getAttribute('data-do-replace') == 'true';
                        
                        const valueToTest = doReplace ? charInput : input.value.concat(charInput);
                        
                        if (!patternRegex.test(valueToTest)) {
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                        
                        if (doReplace) {
                            input.value = charInput;
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }
                    
                    const sibling = /** @type {HTMLElement} */ (input.nextElementSibling);
                    
                    if (sibling) {
                        sibling.focus();
                    }
                });
                
                input.addEventListener('keydown', e => {
                    if (e.key == 'Backspace' || e.keyCode == 8) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.returnValue = false;
                        
                        let currentInput = input;
                        
                        do {
                            currentInput.value = '';
                            
                            const prevSibling = /** @type {HTMLInputElement} */ (currentInput.previousElementSibling);
                            
                            if (prevSibling) {
                                prevSibling.focus();
                            }
                            
                            currentInput = prevSibling;
                        } while (e.ctrlKey && currentInput);
                    } else if (e.key == 'Delete' || e.keyCode == 46) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.returnValue = false;
                        
                        let currentInput = input;
                        
                        do {
                            const sibling = /** @type {HTMLInputElement} */ (currentInput.nextElementSibling);
                            
                            if (sibling && sibling.value) {
                                sibling.focus();
                            }
                            
                            currentInput = sibling;
                            
                            currentInput.value = '';
                        } while (e.ctrlKey && currentInput);
                    } else if ((e.key == 'ArrowLeft' || e.keyCode == 37) || (e.key == 'Home' || e.keyCode == 36)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.returnValue = false;
                        
                        let currentInput = input;
                        
                        do {
                            const prevSibling = /** @type {HTMLInputElement} */ (currentInput.previousElementSibling);
                            
                            if (prevSibling) {
                                prevSibling.focus();
                            }
                            
                            currentInput = prevSibling;
                        } while ((e.ctrlKey || (e.key == 'Home' || e.keyCode == 36)) && currentInput);
                    } else if ((e.key == 'ArrowRight' || e.keyCode == 39) || (e.key == 'End' || e.keyCode == 35)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.returnValue = false;
                        
                        let currentInput = input;
                        
                        do {
                            const sibling = /** @type {HTMLInputElement} */ (currentInput.nextElementSibling);
                            
                            if (sibling && sibling.nextElementSibling && (/** @type {HTMLInputElement} */ (sibling.nextElementSibling)).value) {
                                sibling.focus();
                            }
                            
                            currentInput = sibling;
                        } while ((e.ctrlKey || (e.key == 'End' || e.keyCode == 35)) && currentInput);
                    }
                });
                
                input.addEventListener('focus', () => {
                    let currentInput = input;
                    let prevSibling = undefined;
                    
                    do {
                        if (!currentInput.value) {
                            prevSibling = /** @type {HTMLInputElement} */ (currentInput.previousElementSibling);
                            
                            if (prevSibling && !prevSibling.value) {
                                currentInput = prevSibling;
                            }
                        }
                    } while (prevSibling && !prevSibling.value);
                    
                    if (currentInput != input) {
                        currentInput.focus();
                    }
                });
                
                input.addEventListener('paste', e => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const clipboardData = e.clipboardData;
                    const pastedData = clipboardData.getData('Text');
                    
                    const didChangeValue = setContentFromInput(input, pastedData);
                    
                    if (didChangeValue) {
                        updateHiddenInputValue();
                    }
                });
            });
        });
    }
    
    /**
     * @param {HTMLElement} inputRoot
     * @param {string} content
     */
    setContentFor(inputRoot, content) {
        const firstInput = inputRoot.querySelector('input');
        
        clearInputsOfRoot(inputRoot);
        
        setContentFromInput(firstInput, content);
        
        updateHiddenInputValueFromRoot(inputRoot);
    }
}

export const InputPartition = new InputPartitionLoader();

export default InputPartition;
