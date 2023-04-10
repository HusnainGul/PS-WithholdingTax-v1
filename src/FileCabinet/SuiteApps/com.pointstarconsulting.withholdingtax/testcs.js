/**
 * Copyright 2014 NetSuite Inc.  User may not copy, modify, distribute, or re-bundle or otherwise make available this code.
 */

if (!_4601) { var _4601 = {}; }

_4601.paymentCS = {};

(function () {
    var cs = _4601.paymentCS;
    cs.amountsLookupByTranInternalId = {};
    cs.totalAmount = 0;
    cs.totalWHTAmount = 0;
    cs.allTriggered = false;
    cs.pageInit = function pageInit(type) {
        try {
            console.log("jasim")
            log.debug("check");
            cs.type = type.toString();

            if (_4601.isUI()) {
                cs.pageInit.buildResourceObject();
                cs.isInvoicePayment = (nlapiGetFieldValue('custpage_4601_trantype') === 'sale');
                cs.initialLoad = true;
                // cs.isWiTaxApplicable = !!nlapiGetField('custpage_4601_transactions') || nlapiGetFieldValue('customer') === "" || nlapiGetFieldValue('entity') === "";

                cs.isWiTaxApplicable = true;

                cs.entityFromUrl = getUrlParamValue('entity');
                if (cs.entityFromUrl && cs.type != 'create') {
                    nlapiSetFieldValue('customer', cs.entityFromUrl, false);
                    nlapiSetFieldValue('entity', cs.entityFromUrl, false);
                }

                if (cs.isWiTaxApplicable) {
                    console.log("36 : cs.isWiTaxApplicable (true)");
                    cs.pageInit.buildReferenceRatiosOfTransactions(); // 'public' tx ratio array...
                    cs.pageInit.buildReferenceCreditsOfTransactions();
                    cs.setApplySplitsGlobalReferenceValues(); // added 12.05.2012
                    cs.pageInit.setApplyLineCheckbox();  // actual setting happens on if line is less than or equal 100
                    cs.pageInit.updateItemList();
                    cs.pageInit.populateCustomColumns();
                }

                cs.initialLoad = false;
            } else {
                return true;
            }
        }
        catch (ex) {
            var error_msg = [];
            var triggered_by = ['Error triggered by user:  ', _4601.getCurrentUserName()].join('');
            if (ex instanceof nlobjError) {
                error_msg = ['System Error', '<br/>', ex.getCode(), '<br/>', ex.getDetails(), '<br/>', triggered_by].join('');
            } else {
                error_msg = ['Unexpected Error', '<br/>', ex.toString(), '<br/>', triggered_by].join('');
            }

            throw nlapiCreateError('WITHHOLDING TAX BUNDLE ERROR', error_msg);
        }
    };
    cs.pageInit.updateItemList = function updateItemList() {
        console.log("62 :  cs.pageInit.updateItemList");
        var lineCount = nlapiGetLineItemCount('apply');
        var internalId = '';
        var dueAmount = 0;
        var baseAmount = 0;
        var ratio = 0;
        cs.pageInit.buildReferenceCreditsOfTransactions();

        for (var i = 1; i <= lineCount; i++) {
            dueAmount = nlapiGetLineItemValue('apply', 'due', i);
            internalId = nlapiGetLineItemValue('apply', 'doc', i);
            if (cs.referenceRatiosOfPaymentApplyLines) {
                ratio = cs.referenceRatiosOfPaymentApplyLines[internalId] ? cs.referenceRatiosOfPaymentApplyLines[internalId] : 0;
            }
            baseAmount = (dueAmount / (ratio + 1)) || 0;
            cs.totalWHTAmount += Number(dueAmount - baseAmount);
            cs.totalAmount += Number(dueAmount);
        }
    }
    cs.pageInit.populateCustomColumns = function populateCustomColumns() {
        console.log("81 : cs.pageInit.populateCustomColumns");
        var lineCount = nlapiGetLineItemCount('apply');
        if (!cs.referenceCreditAmountsOfApplyLines) {
            cs.pageInit.buildReferenceCreditsOfTransactions();
        }
        for (var index = 1; index <= lineCount; index++) {
            if (nlapiGetLineItemValue('apply', 'apply', index) === 'T') {
                var internalId = nlapiGetLineItemValue('apply', 'doc', index);
                var paidAmount = parseFloat(nlapiGetLineItemValue('apply', 'amount', index)) || 0;
                var savedWiTaxAmount = cs.referenceCreditAmountsOfApplyLines[internalId] ? cs.referenceCreditAmountsOfApplyLines[internalId].creditToReflectWiTax : 0;
                var totalAmount = paidAmount + savedWiTaxAmount;
                var uiLineNo = cs.getActualUiApplyLineNo(index);

                if (cs.uiWiTaxCustomColumnIsShown(uiLineNo)) {
                    var lineWiTaxWithheldAmount = _4601.formatCurrency(savedWiTaxAmount);
                    var indexOffset = cs.computeApplyColumnIndexOffset({
                        applyHeaderLength: cs.applySplitsColumns.length,
                        applyRowLength: cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length
                    });
                    cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxAmountColumnPosition - indexOffset].innerHTML = lineWiTaxWithheldAmount;
                }

                if (cs.uiTotalAmtCustomColumnIsShown(uiLineNo)) {
                    var lineTotalAmount = _4601.formatCurrency(totalAmount);
                    var indexOffset = cs.computeApplyColumnIndexOffset({
                        applyHeaderLength: cs.applySplitsColumns.length,
                        applyRowLength: cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length
                    });
                    cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxTotalColumnPosition - indexOffset].innerHTML = lineTotalAmount;
                }

            }
        }

    }
    cs.pageInit.getUrlParameter = function getUrlParameter(urlParameter) {
        var parameter;
        if (!urlParameter) { parameter = getParameter('inv') || getParameter('bill'); }
        else { parameter = getParameter(urlParameter); }
        return parameter;
    };

    cs.pageInit.reloadPage = function reloadPageFromPageInit(inv) {
        console.log("123 :   cs.pageInit.reloadPage")
        setWindowChanged(window, false);
        window.onbeforeunload = null;
        var href = document.location.href;
        href = removeParamFromURL(href, 'inv');
        href = removeParamFromURL(href, 'bill');
        href = addParamToURL(href, 'custpage_id', inv, true);
        document.location = href;
    };

    cs.pageInit.buildResourceObject = function buildResourceObject() {
        cs.resourceObject = JSON.parse(nlapiGetFieldValue('custpage_4601_resobj'));
    };

    cs.pageInit.buildReferenceRatiosOfTransactions = function buildReferenceRatiosOfTransactions() {
        cs.referenceRatiosOfPaymentApplyLines = JSON.parse(nlapiGetFieldValue('custpage_4601_transactions'));
    };

    cs.pageInit.buildReferenceCreditsOfTransactions = function buildReferenceCreditsOfTransactions() {
        cs.referenceCreditAmountsOfApplyLines = JSON.parse(nlapiGetFieldValue('custpage_4601_credits'));
    };

    cs.pageInit.setApplyLineCheckbox = function setApplyLineCheckbox() {

        console.log("145 : cs.pageInit.setApplyLineCheckbox")
        var lineCount = nlapiGetLineItemCount('apply');
        var tranId = cs.pageInit.getUrlParameter();
        var lineToUpdate = 0;
        var origPaymentAmount = nlapiGetFieldValue("payment");

        if (cs.type === 'edit') {
            for (var i = 1; i <= lineCount; i++) {
                if (nlapiGetLineItemValue('apply', 'apply', i) === 'T') {
                    var lineLookupId = nlapiGetLineItemValue('apply', 'doc', i);
                    if (cs.referenceCreditAmountsOfApplyLines[lineLookupId]) {
                        var amount = parseFloat(nlapiGetLineItemValue('apply', 'amount', i)) || 0;
                        nlapiSetLineItemValue('apply', 'amount', i, amount); // this is needed to trigger re-computation...
                    }
                }
            }

            nlapiSetFieldValue("payment", origPaymentAmount);
        }

        else if (cs.type === 'create') {
            if (tranId) {
                var taxamount = parseFloat(nlapiGetFieldValue('custpage_4601_withheld'));
                lineToUpdate = nlapiFindLineItemValue('apply', 'doc', tranId);

                if (lineToUpdate && taxamount > 0) {
                    alert(
                        cs.isInvoicePayment ?
                            cs.resourceObject.TRANS_CS['form_details'].WTAX_AMOUNT_FIELD_INV_WARNING.message :
                            cs.resourceObject.TRANS_CS['form_details'].WTAX_AMOUNT_FIELD_BILL_WARNING.message
                    );
                }
            }
        }

        // NOTE: when in 'view' mode, the client side 'Page Init' function is never triggered.
        // if the 'Page Init' is triggered in view mode, the code below would handle the displaying of the wtax amount and total amount (custom columns) of the paid lines.
        // As it is, these custom column fields display are NOT being updated...
        /*
        else if(cs.type === 'view'){
            for (var i = 1; i <= lineCount; i++) {
                var internalId = parseFloat(nlapiGetLineItemValue('apply', 'doc', i));
                var paidAmount = parseFloat(nlapiGetLineItemValue('apply', 'amount', i)) || 0;
                var savedWiTaxAmount = cs.referenceCreditAmountsOfApplyLines[internalId] ? cs.referenceCreditAmountsOfApplyLines[internalId] : 0;
                var totalAmount = paidAmount + savedWiTaxAmount;  
                var uiLineNo = cs.getActualUiApplyLineNo(i);
                if (cs.uiWiTaxCustomColumnIsShown(uiLineNo)){
                    var lineWiTaxWithheldAmount = _4601.formatCurrency(savedWiTaxAmount);
                    cs.applySplitsRows['applyrow'+(uiLineNo)].cells[cs.wiTaxAmountColumnPosition].innerHTML = lineWiTaxWithheldAmount;
                }
            	
                if (cs.uiTotalAmtCustomColumnIsShown(uiLineNo)){
                    var lineTotalAmount = _4601.formatCurrency(totalAmount);
                    cs.applySplitsRows['applyrow'+(uiLineNo)].cells[cs.wiTaxTotalColumnPosition].innerHTML = lineTotalAmount;
                }
            }
        }
        */
    };

    cs.fieldChanged = function fieldChanged(sublistName, fieldName, linenum) {
        try {
            if (_4601.isUI()) {
                debugger
                console.log("fieldChanged 202");
                console.log("CS: ", cs);
                log.debug("fieldChanged 202");
                // for the bill payment side, this is not necessary as the form reloads by default when 'entity' field is changed... 
                //if (!sublistName && (['customer', 'entity', 'currency'].indexOf(fieldName) > -1)) { cs.fieldChanged.doPageReload(fieldName); }
                if (!sublistName && (['customer', 'entity'].indexOf(fieldName) > -1)) { cs.fieldChanged.doPageReload(fieldName); }
                if (!sublistName && (['apacct', 'aracct'].indexOf(fieldName) > -1)) { nlapiSetFieldValue('custpage_4601_withheld', 0); }
                // 'currency' is included above, just in case multicurrency is on... 
                if (cs.isWiTaxApplicable) {
                    // might need to disable the handling when 'Auto Apply' is marked. 01.02.2013 - start
                    if (!sublistName && cs.referenceRatiosOfPaymentApplyLines && fieldName === 'autoapply') {
                        if (nlapiGetFieldValue(fieldName) === 'T') { cs.fieldChanged.doAutoApplyProcess(); }

                    }
                    // might need to disable the handling when 'Auto Apply' is marked. 01.02.2013 - end

                    else if (cs.referenceRatiosOfPaymentApplyLines && sublistName === 'apply' && ['apply', 'amount', 'disc'].indexOf(fieldName) > -1) {
                        // check whether the currently 'apply'-ied line is found in the payment ratios list, if not found ignore...
                        //cs.fieldChanged.updateLookupValues(sublistName);
                        var internalId = '';
                        if (cs.allTriggered) {
                            var itemCount = nlapiGetLineItemCount(sublistName);
                            for (var i = 1; i <= itemCount; i++) {
                                internalId = nlapiGetLineItemValue(sublistName, 'doc', i);
                                if (cs.referenceRatiosOfPaymentApplyLines[internalId]) { cs.fieldChanged.doCurrentLineProcess(sublistName, i, fieldName); }
                                else { cs.fieldChanged.addUpdatePaymentTotalLookup(sublistName, i, internalId); }
                            }
                        }
                        else {
                            // internalId = nlapiGetLineItemValue(sublistName, 'doc', linenum);
                            internalId = 38149;
                            if (cs.referenceRatiosOfPaymentApplyLines[internalId]) { cs.fieldChanged.doCurrentLineProcess(sublistName, linenum, fieldName); }
                            else { cs.fieldChanged.addUpdatePaymentTotalLookup(sublistName, linenum, internalId); }
                        }
                        cs.allTriggered = false;
                    }
                }
            } else {
                return true;
            }
        }
        catch (ex) {
            throw nlapiCreateError("WITHHOLDING TAX BUNDLE ERROR",
                ["Error triggered by user:  ", _4601.getCurrentUserName(), "\n", ex.toString()].join(""));
        }
    };

    cs.fieldChanged.addUpdatePaymentTotalLookup = function addUpdatePaymentTotalLookup(sublistName, linenum, internalId) {
        var lineAmount = parseFloat(nlapiGetLineItemValue(sublistName, 'amount', linenum)) || 0;
        var lineDiscAmount = parseFloat(nlapiGetLineItemValue(sublistName, 'disc', linenum)) || 0;

        // build the amount lookup for the paid line...this is necessary as we are modifying the 'innerHTML' of 2 columns...
        var lineTransaction = {};
        var lineLookupId = '' + internalId;
        lineTransaction.LinePaymentAmount = lineAmount;
        lineTransaction.LineWithheldAmount = 0;
        lineTransaction.LineTotalAmount = lineAmount + lineDiscAmount;

        if (cs.unformattedAmountLookup[lineLookupId]) {
            cs.unformattedAmountLookup[lineLookupId].LinePaymentAmount += lineAmount;
            cs.unformattedAmountLookup[lineLookupId].LineTotalAmount += (lineAmount + lineDiscAmount);
        } else {
            cs.unformattedAmountLookup[lineLookupId] = lineTransaction;
        }

        cs.amountsLookupByTranInternalId[linenum] = {};
        cs.amountsLookupByTranInternalId[linenum].LinePaymentAmount = lineAmount;
        cs.amountsLookupByTranInternalId[linenum].LineWithheldAmount = 0;
        cs.amountsLookupByTranInternalId[linenum].LineTotalAmount = lineAmount + lineDiscAmount;

        cs.updateBillPaymentAndWiTaxTotalDisplay();
    };

    cs.fieldChanged.doPageReload = function doPageReloadFromFieldChanged(fieldName) {
        if (fieldName === 'currency') {
            var currency = nlapiGetFieldValue(fieldName);
            var entityId = nlapiGetFieldValue('customer') || nlapiGetFieldValue('entity');
            if (entityId) { nlapiChangeCall({ entity: entityId, currency: currency }); }
            else { nlapiChangeCall({ currency: currency }); }
        }
        else {
            var entityId = nlapiGetFieldValue(fieldName); // 'customer' 
            if (entityId) { nlapiChangeCall({ entity: entityId }); }
            else { cs.fieldChanged.reloadPage(); }
        }
    };

    cs.fieldChanged.doAutoApplyProcess = function doAutoApplyProcess() {
        var totalPayment = cs.fieldChanged.getTotalPaymentAmount();
        cs.fieldChanged.processAutoApplyForAllApplyLines(totalPayment);
    };

    cs.fieldChanged.doCurrentLineProcess = function doCurrentLineProcess(sublistName, linenum, fieldName) {
        cs.fieldChanged.setAutoApplyValue(false);
        // include discount amount...
        var lineAmount = parseFloat(nlapiGetLineItemValue(sublistName, 'amount', linenum)) || 0;
        lineAmount ? cs.fieldChanged.processCurrentApplyLineWithAmount(sublistName, linenum, lineAmount, fieldName) :
            cs.fieldChanged.processCurrentApplyLineWithNoAmount(sublistName, linenum);
        cs.fieldChanged.setTotalPaymentToBlank();
    };

    cs.fieldChanged.reloadPage = function reloadPageFromFieldChanged() {
        console.log("310: cs.fieldChanged.reloadPage");
        var href = removeParamFromURL(document.location.href, 'entity');
        setWindowChanged(window, false);
        window.onbeforeunload = null;
        document.location = href;
    };

    cs.fieldChanged.processAutoApplyForAllApplyLines = function processAutoApplyForAllApplyLines(totalPaymentAmount) {
        var remainingPaymentAmount = totalPaymentAmount; // totalPaymentAmount has been parseFloated before being passed here...
        var sublistName = 'apply';
        var lineCount = nlapiGetLineItemCount(sublistName);
        var total = 0;
        for (var i = 1; i <= lineCount; i++) {
            if (remainingPaymentAmount > 0) {
                var actualAmount = cs.fieldChanged.processCurrentApplyLineWithAmount(sublistName, i, remainingPaymentAmount);
                remainingPaymentAmount -= actualAmount;
                total += actualAmount;
            }
            else { cs.fieldChanged.processCurrentApplyLineWithNoAmount(sublistName, i); }
        }
        cs.fieldChanged.setAutoApplyValue(false);
        cs.fieldChanged.setTotalPaymentToBlank();
    };

    cs.fieldChanged.processCurrentApplyLineWithAmount = function processCurrentApplyLineWithAmount(sublistName, linenum, inputPaymentAmount, fieldName) {
        var internalId = nlapiGetLineItemValue(sublistName, 'doc', linenum);
        var paymentAmountAppliedToLineUserInput = inputPaymentAmount;
        var discountAmountAppliedToLineUserInput = parseFloat(nlapiGetLineItemValue(sublistName, 'disc', linenum)) || 0;

        if (fieldName && fieldName === 'disc') {
            // use the 'LineTotalAmount' NOT 'LinePaymentAmount'
            // when the 'apply' field is already checked, and the discount amount is changed, need to retrieve the line's total amount and remove the wtax amount...
            var totalAmountOfLine = cs.unformattedAmountLookup[internalId] ? parseFloat(cs.unformattedAmountLookup[internalId].LineTotalAmount) || 0 : 0;
            var withheldAmountOfLine = cs.unformattedAmountLookup[internalId] ? parseFloat(cs.unformattedAmountLookup[internalId].LineWithheldAmount) || 0 : 0;
            paymentAmountAppliedToLineUserInput = totalAmountOfLine - withheldAmountOfLine;
        }

        if (fieldName && fieldName === 'apply') {

            console.log("fieldName === 'apply' 341");
            // when the 'Apply' checkbox is clicked, the NetSuite behavior kicks-in wherein the 'Payment' column is automatically 
            // reduced by the discount amount already set before the 'Apply' field was marked. Need to put back in the discount amount for
            // the computation purposes...
            paymentAmountAppliedToLineUserInput = inputPaymentAmount + discountAmountAppliedToLineUserInput;
        }

        var taxAmountToBaseAmountRatio = cs.referenceRatiosOfPaymentApplyLines[internalId];
        var dueAmtColumnNetOfCreditAmountThatReflectWiTax = (parseFloat(nlapiGetLineItemValue(sublistName, 'due', linenum)) || 0);
        var creditAmountThatReflectWiTax = cs.referenceCreditAmountsOfApplyLines[internalId] ? cs.referenceCreditAmountsOfApplyLines[internalId].creditToReflectWiTax : 0;

        if (['view', 'edit'].indexOf(cs.type) > -1) {
            dueAmtColumnNetOfCreditAmountThatReflectWiTax += creditAmountThatReflectWiTax;
            if (cs.initialLoad) {
                dueAmtColumnPlusCreditAmountThatReflectWiTax += discountAmountAppliedToLineUserInput;
                paymentAmountAppliedToLineUserInput += discountAmountAppliedToLineUserInput;
            }
            creditAmountThatReflectWiTax = 0;
        }

        var dueAmtColumnPlusCreditAmountThatReflectWiTax = (dueAmtColumnNetOfCreditAmountThatReflectWiTax + creditAmountThatReflectWiTax);
        var computedMaximumPaymentAmountAllowedForLine = cs.fieldChanged.getComputedMaximumPaymentAmountAllowedForLine(dueAmtColumnPlusCreditAmountThatReflectWiTax, taxAmountToBaseAmountRatio);
        var computedPaymentAmountOfLineToUseInComputation = cs.fieldChanged.getComputedPaymentAmountOfLineToUseInComputation(paymentAmountAppliedToLineUserInput, computedMaximumPaymentAmountAllowedForLine);
        var computedResultsForLine = cs.fieldChanged.getComputedResultsForLine(computedPaymentAmountOfLineToUseInComputation, discountAmountAppliedToLineUserInput, creditAmountThatReflectWiTax, taxAmountToBaseAmountRatio);

        cs.fieldChanged.setApplyLineValues(sublistName, linenum, computedResultsForLine);
        return computedResultsForLine.ComputedLinePaymentAmount;
    };

    cs.fieldChanged.processCurrentApplyLineWithNoAmount = function processCurrentApplyLineWithNoAmount(sublistName, linenum) {
        var lineLookupId = nlapiGetLineItemValue(sublistName, 'doc', linenum);
        var totalAmountOfLine = 0;
        var withheldAmountOfLine = 0;
        var amountToRemoveFromTotalPayment = 0;

        if (cs.unformattedAmountLookup[lineLookupId]) {
            totalAmountOfLine = cs.unformattedAmountLookup[lineLookupId].LineTotalAmount || 0; // don't use 'LinePaymentAmount'  
            withheldAmountOfLine = cs.unformattedAmountLookup[lineLookupId].LineWithheldAmount || 0;
            amountToRemoveFromTotalPayment = (totalAmountOfLine - withheldAmountOfLine);
        }

        cs.fieldChanged.resetApplyLineValues(linenum);
        return -amountToRemoveFromTotalPayment;
    };

    cs.fieldChanged.setTotalPaymentToBlank = function setTotalPaymentToBlank() {
        nlapiSetFieldValue('payment', "");
    };

    cs.fieldChanged.getTotalPaymentAmount = function getTotalPaymentAmount() {
        return (parseFloat(nlapiGetFieldValue('payment')) || 0);
    };

    cs.fieldChanged.getComputedResultsForLine = function getComputedResultsForLine(computedPaymentAmountOfLineToUseInComputation, discountAmountAppliedToLineUserInput, creditAmountThatReflectWiTax, taxAmountToBaseAmountRatio) {
        var resultsObject = {};
        // compute for the new values of affected columns
        var computedLinePaymentAmount = computedPaymentAmountOfLineToUseInComputation - discountAmountAppliedToLineUserInput - creditAmountThatReflectWiTax;
        resultsObject.ComputedLinePaymentAmount = computedLinePaymentAmount < 0 ? 0 : computedLinePaymentAmount;
        resultsObject.ComputedLineWiTaxAmount = computedLinePaymentAmount <= 0 ? 0 : (computedPaymentAmountOfLineToUseInComputation * taxAmountToBaseAmountRatio);
        resultsObject.ComputedLineTotalAmount = computedLinePaymentAmount <= 0 ? 0 :
            (resultsObject.ComputedLinePaymentAmount + resultsObject.ComputedLineWiTaxAmount + discountAmountAppliedToLineUserInput);
        return resultsObject;
    };

    cs.fieldChanged.getComputedMaximumPaymentAmountAllowedForLine = function getComputedMaximumPaymentAmountAllowedForLine(dueAmtColumnPlusCreditAmountThatReflectWiTax, taxAmountToBaseAmountRatio) {
        return (dueAmtColumnPlusCreditAmountThatReflectWiTax / (taxAmountToBaseAmountRatio + 1)) || 0;
    };

    cs.fieldChanged.getComputedPaymentAmountOfLineToUseInComputation = function getComputedPaymentAmountOfLineToUseInComputation(paymentAmountAppliedToLineUserInput, computedMaximumPaymentAmountAllowedForLine) {
        var computedPaymentAmountOfLineToUseInComputation = 0;
        if (paymentAmountAppliedToLineUserInput > computedMaximumPaymentAmountAllowedForLine) {
            computedPaymentAmountOfLineToUseInComputation = computedMaximumPaymentAmountAllowedForLine;
        }
        else { computedPaymentAmountOfLineToUseInComputation = paymentAmountAppliedToLineUserInput; }
        return computedPaymentAmountOfLineToUseInComputation;
    };

    cs.fieldChanged.resetApplyLineValues = function resetApplyLineValues(linenum) {
        var uiLineNo = cs.getActualUiApplyLineNo(linenum);
        var lineLookupId = nlapiGetLineItemValue('apply', 'doc', linenum);

        if (cs.uiWiTaxCustomColumnIsShown(uiLineNo)) {
            var indexOffset = cs.computeApplyColumnIndexOffset({
                applyHeaderLength: cs.applySplitsColumns.length,
                applyRowLength: cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length
            });
            cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxAmountColumnPosition - indexOffset].innerHTML = "";
        }
        if (cs.uiTotalAmtCustomColumnIsShown(uiLineNo)) {
            var indexOffset = cs.computeApplyColumnIndexOffset({
                applyHeaderLength: cs.applySplitsColumns.length,
                applyRowLength: cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length
            });
            cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxTotalColumnPosition - indexOffset].innerHTML = "";
        }

        // set the lookup object's payment amount and withheld amount fields to ZERO        
        if (cs.amountsLookupByTranInternalId[linenum]) {
            cs.amountsLookupByTranInternalId[linenum].LinePaymentAmount = 0;
            cs.amountsLookupByTranInternalId[linenum].LineWithheldAmount = 0;
            cs.amountsLookupByTranInternalId[linenum].LineTotalAmount = 0;
        }

        cs.updateBillPaymentAndWiTaxTotalDisplay();  // update the Amount field display for Bill Payment only.
    };

    cs.fieldChanged.setApplyLineValues = function setApplyLineValues(sublistName, linenum, computedResultsForLine) {
        var lineLookupId = '' + nlapiGetLineItemValue('apply', 'doc', linenum);
        if (computedResultsForLine) {

            // update the line's payment amount with the computed payment amount...
            nlapiSetLineItemValue(sublistName, 'amount', linenum, nlapiFormatCurrency(computedResultsForLine.ComputedLinePaymentAmount));

            console.log("456: update the line's payment amount with the computed payment amount");
            // update the custom column fields if they are shown in the sublist. They are shown if the Apply sublist had been manually customized to display them.
            var uiLineNo = cs.getActualUiApplyLineNo(linenum);
            if (cs.uiWiTaxCustomColumnIsShown(uiLineNo)) {
                var lineWiTaxWithheldAmount = _4601.formatCurrency(computedResultsForLine.ComputedLineWiTaxAmount);
                var indexOffset = cs.computeApplyColumnIndexOffset({
                    applyHeaderLength: cs.applySplitsColumns.length,
                    applyRowLength: cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length
                });
                cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxAmountColumnPosition - indexOffset].innerHTML = lineWiTaxWithheldAmount;
            }

            if (cs.uiTotalAmtCustomColumnIsShown(uiLineNo)) {
                var lineTotalAmount = _4601.formatCurrency(computedResultsForLine.ComputedLineTotalAmount);
                var indexOffset = cs.computeApplyColumnIndexOffset({
                    applyHeaderLength: cs.applySplitsColumns.length,
                    applyRowLength: cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length
                });
                cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxTotalColumnPosition - indexOffset].innerHTML = lineTotalAmount;
            }

            // build the amount lookup for the paid line...this is necessary as we are modifying the 'innerHTML' of 2 columns...
            var lineTransaction = {};
            lineTransaction.LinePaymentAmount = computedResultsForLine.ComputedLinePaymentAmount;
            lineTransaction.LineWithheldAmount = computedResultsForLine.ComputedLineWiTaxAmount;
            lineTransaction.LineTotalAmount = computedResultsForLine.ComputedLineTotalAmount;
            cs.unformattedAmountLookup[lineLookupId] = lineTransaction;

            cs.amountsLookupByTranInternalId[linenum] = {};
            cs.amountsLookupByTranInternalId[linenum].LinePaymentAmount = lineTransaction.LinePaymentAmount;
            cs.amountsLookupByTranInternalId[linenum].LineWithheldAmount = lineTransaction.LineWithheldAmount;
            cs.amountsLookupByTranInternalId[linenum].LineTotalAmount = lineTransaction.LineTotalAmount;
            cs.updateBillPaymentAndWiTaxTotalDisplay();
        }
    };

    cs.fieldChanged.setAutoApplyValue = function setAutoApplyValue(value) {
        if (!value || value === false) { nlapiSetFieldValue('autoapply', 'F'); }
        else { nlapiSetFieldValue('autoapply', 'T'); }
    };

    cs.updateBillPaymentAndWiTaxTotalDisplay = function updateBillPaymentAndWiTaxTotalDisplay() {
        var totalPaymentAmountForDisplay = 0;
        var totalWiTaxWithheldAmount = 0;
        for (var i in cs.amountsLookupByTranInternalId) {
            var applyLineObject = cs.amountsLookupByTranInternalId[i];
            totalWiTaxWithheldAmount += applyLineObject.LineWithheldAmount;
            totalPaymentAmountForDisplay += applyLineObject.LinePaymentAmount; // DON'T use the 'LineTotalAmount'...
        };
        nlapiSetFieldValue('custpage_4601_withheld', totalWiTaxWithheldAmount);

        // update the 'Amount' display field only for the Bill Payment. 
        if (!cs.isInvoicePayment) { cs.inlineTotalAmount.innerHTML = _4601.formatCurrency(totalPaymentAmountForDisplay); }
    };

    cs.uiWiTaxCustomColumnIsShown = function uiWiTaxCustomColumnIsShown(uiLineNo) {
        var applyRowLength = cs.applySplitsRows['applyrow' + (uiLineNo)] && cs.applySplitsRows['applyrow' + (uiLineNo)].cells ? cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length : 0;
        var indexOffset = cs.computeApplyColumnIndexOffset({
            applyHeaderLength: cs.applySplitsColumns.length,
            applyRowLength: applyRowLength
        });
        return cs.wiTaxAmountColumnPosition > -1 && cs.applySplitsRows['applyrow' + (uiLineNo)] &&
            cs.applySplitsRows['applyrow' + (uiLineNo)].cells && cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxAmountColumnPosition - indexOffset];
    };

    cs.uiTotalAmtCustomColumnIsShown = function uiTotalAmtCustomColumnIsShown(uiLineNo) {
        var applyRowLength = cs.applySplitsRows['applyrow' + (uiLineNo)] && cs.applySplitsRows['applyrow' + (uiLineNo)].cells ? cs.applySplitsRows['applyrow' + (uiLineNo)].cells.length : 0;
        var indexOffset = cs.computeApplyColumnIndexOffset({
            applyHeaderLength: cs.applySplitsColumns.length,
            applyRowLength: applyRowLength
        });
        return cs.wiTaxTotalColumnPosition > -1 && cs.applySplitsRows['applyrow' + (uiLineNo)] &&
            cs.applySplitsRows['applyrow' + (uiLineNo)].cells && cs.applySplitsRows['applyrow' + (uiLineNo)].cells[cs.wiTaxTotalColumnPosition - indexOffset];
    };

    cs.getActualUiApplyLineNo = function getActualUiApplyLineNo(linenum) {
        cs.setApplySplitsValues();
        var uiLineNo = linenum - 1;
        return uiLineNo;
    };

    cs.setApplySplitsValues = function setApplySplitsValues() {
        cs.applySplits = document.getElementById('apply_splits');
        cs.applySplitsHeaderRow = document.getElementById('applyheader');
        cs.applySplitsRows = cs.applySplits.rows;
        cs.applySplitsColumns = cs.applySplitsRows[0].cells; // cs.applySplitsRows[0] is the 'applyheader' row...
        cs.inlineTotalAmount = document.getElementById('total_val');
    };

    cs.setApplySplitsGlobalReferenceValues = function setApplySplitsGlobalReferenceValues() {
        cs.setApplySplitsValues();
        cs.unformattedAmountLookup = {};
        var sublistName = 'apply';

        // when editing..retrieve existing payments made..
        if (cs.type === 'edit') {
            cs.totalPaymentAmount = parseFloat(nlapiGetFieldValue('total')) || 0; // for edit, retrieve the total amount...

            var lineCount = nlapiGetLineItemCount(sublistName);
            for (var i = 1; i <= lineCount; i++) {
                if (nlapiGetLineItemValue(sublistName, 'apply', i) === 'T') {
                    var lineLookupId = '' + nlapiGetLineItemValue(sublistName, 'doc', i);
                    var discAmount = parseFloat(nlapiGetLineItemValue(sublistName, 'disc', i)) || 0;
                    var lineTransaction = {};
                    var savedCreditAmount = cs.referenceCreditAmountsOfApplyLines[lineLookupId] ? (parseFloat(cs.referenceCreditAmountsOfApplyLines[lineLookupId].creditToReflectWiTax) || 0) : 0;
                    lineTransaction.LinePaymentAmount = parseFloat(nlapiGetLineItemValue(sublistName, 'amount', i)) || 0;
                    lineTransaction.LineWithheldAmount = savedCreditAmount;
                    lineTransaction.LineTotalAmount = lineTransaction.LinePaymentAmount + lineTransaction.LineWithheldAmount + discAmount;

                    cs.unformattedAmountLookup[lineLookupId] = lineTransaction;

                    cs.amountsLookupByTranInternalId[i] = {};
                    cs.amountsLookupByTranInternalId[i].LinePaymentAmount = lineTransaction.LinePaymentAmount;
                    cs.amountsLookupByTranInternalId[i].LineWithheldAmount = lineTransaction.LineWithheldAmount;
                    cs.amountsLookupByTranInternalId[i].LineTotalAmount = lineTransaction.LineTotalAmount;
                }
            }
        }

        cs.wiTaxAmountColumnPosition = -1; // this tracks the actual form column position. set it initially to -1
        cs.wiTaxTotalColumnPosition = -1; // this tracks the actual form column position. set it initially to -1
        for (var i = 0; i < cs.applySplitsColumns.length; i++) {

            // CUSTBODY_4601_WTAX_WITHHELD' - look for the Tax Withheld column
            var wiTaxWithheldColumnOnClickString = "";
            if (cs.applySplitsColumns[i] && cs.applySplitsColumns[i].onclick) { wiTaxWithheldColumnOnClickString = ((cs.applySplitsColumns[i].onclick).toString()).toLowerCase(); }
            var isWiTaxAmountColumnFound = wiTaxWithheldColumnOnClickString.indexOf('custbody_4601_wtax_withheld') > -1;
            if (isWiTaxAmountColumnFound) { cs.wiTaxAmountColumnPosition = i; continue; }

            // CUSTBODY_4601_TOTAL_AMT - look for the Total Amount column
            var wiTotalAmountColumnOnClickString = "";
            if (cs.applySplitsColumns[i] && cs.applySplitsColumns[i].onclick) { wiTotalAmountColumnOnClickString = ((cs.applySplitsColumns[i].onclick).toString()).toLowerCase(); }
            var isWiTaxTotalColumnFound = wiTotalAmountColumnOnClickString.indexOf('custbody_4601_total_amt') > -1;
            if (isWiTaxTotalColumnFound) { cs.wiTaxTotalColumnPosition = i; }

        }
    };

    cs.computeApplyColumnIndexOffset = function computeApplyColumnIndexOffset(context) {
        var columnIndexOffset = 0;
        columnIndexOffset = context.applyHeaderLength - context.applyRowLength;

        return columnIndexOffset;
    };

    cs.recalcFunction = function recalcFunction(type) {
        try {
            if (cs.isInvoicePayment === null || cs.isInvoicePayment === undefined) {
                cs.isInvoicePayment = (nlapiGetFieldValue('custpage_4601_trantype') === 'sale');
            }
            if (cs.isWiTaxApplicable && type == 'apply' && !cs.isInvoicePayment) {
                if (!cs.inlineTotalAmount) {
                    cs.inlineTotalAmount = document.getElementById('total_val');
                }

                if (cs.inlineTotalAmount.innerHTML == 0) {
                    nlapiSetFieldValue('custpage_4601_withheld', 0, false);
                }
                else if (cs.inlineTotalAmount.innerHTML == _4601.formatCurrency(cs.totalAmount)) {

                    nlapiSetFieldValue('custpage_4601_withheld', cs.totalWHTAmount, false);
                    cs.inlineTotalAmount.innerHTML = _4601.formatCurrency(cs.totalAmount - cs.totalWHTAmount);
                }
                cs.allTriggered = true;
            }
        }
        catch (ex) {
            var error_msg = [];
            var triggered_by = ['Error triggered by user:  ', _4601.getCurrentUserName()].join('');
            if (ex instanceof nlobjError) {
                error_msg = ['System Error', '<br/>', ex.getCode(), '<br/>', ex.getDetails(), '<br/>', triggered_by].join('');
            } else {
                error_msg = ['Unexpected Error', '<br/>', ex.toString(), '<br/>', triggered_by].join('');
            }

            throw nlapiCreateError('WITHHOLDING TAX BUNDLE ERROR', error_msg);
        }
    };
}());