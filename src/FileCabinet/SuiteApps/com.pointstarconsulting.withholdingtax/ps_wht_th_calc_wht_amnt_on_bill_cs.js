/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/search', 'N/log'],
    function (currentRecord, nsRecord, dialog, search, log) {


        let whtTaxCodeFld = 'custcol_ps_wht_tax_code';
        let whtTaxRateFld = 'custcol_ps_wht_tax_rate';
        let whtBaseAmountFld = 'custcol_ps_wht_base_amount';
        let whtTaxAmountFld = 'custcol_ps_wht_tax_amount';
        let whtPartialWhtAmountFld = 'custcol_ps_wht_partial_wht_amount';
        let whtPartialPaymentAmountFld = 'custcol_wht_partial_payment_amount';
        let whtRemainingAmountFld = 'custcol_ps_wht_remaining_amount';
        let lineAmountFld = 'amount';
        let isApplyWhtPartialAmountFld = 'custcol_ps_wht_apply_partial_payments';
        let whtBillLineNoFld = 'custcol_ps_wht_bill_line_no';

        function checkRelatedBillCredits(billId) {
            let noOfBillCredits;
            if (billId) {
                let vendorcreditSearchObj = search.create({
                    type: "vendorcredit",
                    filters:
                        [
                            ["type", "anyof", "VendCred"],
                            "AND",
                            ["createdfrom.internalid", "anyof", billId]
                        ],
                    columns:
                        [
                            "tranid"
                        ]
                });

                let results = vendorcreditSearchObj.run().getRange({ start: 0, end: 1000 });

                (results.length > 0) ? noOfBillCredits = results.length : noOfBillCredits = 0;

            }

            log.debug("noOfBillCredits: ", noOfBillCredits);

            return noOfBillCredits

        }


        function calculateRemainingBillAmount(billId, lineNo, whtRate) {

            log.debug("billId::", billId);

            if (billId && lineNo && whtRate) {

                let vendorcreditSearchObj = search.create({
                    type: "vendorcredit",
                    filters:
                        [
                            ["type", "anyof", "VendCred"],
                            "AND",
                            ["createdfrom.internalid", "anyof", billId]
                        ],
                    columns:
                        [
                            'type',
                            'tranid',
                            'amount',
                            whtBillLineNoFld
                        ]
                });

                let results = vendorcreditSearchObj.run().getRange({ start: 0, end: 1000 });

                let billCreditAmount = 0;
                let billPaymentAmount = 0;

                log.debug("Results : ", results);
                log.debug("Results lenght : ", results.length);

                for (let i = 0; i < results.length; i++) {
                    let billLineNo = results[i].getValue({ name: whtBillLineNoFld });

                    if (billLineNo == lineNo) {

                        let amount = parseFloat(results[i].getValue({ name: lineAmountFld }));

                        log.debug("amount" + i, amount);

                        billCreditAmount = billCreditAmount + amount

                        log.debug("billCreditAmount" + i, billCreditAmount);

                        let paymentAmount = amount / (whtRate / 100);

                        log.debug("paymentAmount" + i, paymentAmount);

                        billPaymentAmount = billPaymentAmount + paymentAmount

                        log.debug("billPaymentAmount" + i, billPaymentAmount);

                    }

                }

                log.debug("billCreditAmount : ", billCreditAmount);
                log.debug("billPaymentAmount : ", billPaymentAmount);

                // let totalAmount = billCreditAmount + billPaymentAmount;
                let totalAmount = billPaymentAmount;

                return totalAmount

            }

            else {
                return 0
            }




        }

        function getCountryId(countryName) {

            let customrecord_wht_countrySearchObj = search.create({
                type: "customrecord_wht_country",
                filters:
                    [
                        ["name", "haskeywords", countryName]
                    ],
                columns:
                    [
                        "internalid"
                    ]
            });

            let internalId = '';

            customrecord_wht_countrySearchObj.run().each(function (result) {

                internalId = result.getValue("internalid")

                return true;

            });


            log.debug('internalId', internalId);

            return internalId
        }

        function pageInit(context) {

            // if (context.mode == "create") {

            //     console.log('context.mode == create')

            //     context.currentRecord.getCurrentSublistField({
            //         sublistId: 'item',
            //         fieldId: whtPartialWhtAmountFld
            //     }).isDisplay = false;

            //     context.currentRecord.getCurrentSublistField({
            //         sublistId: 'item',
            //         fieldId: whtPartialPaymentAmountFld
            //     }).isDisplay = false;

            // }




            // if (context.currentRecord.type == 'vendorbill') {

            //     //Check1 : context.mode = edit
            //     //Check2 : partialPayment checkbox
            //     //Check4 : Make Copy pe context pe, Remaining amount empty krwani hai
            //     //Check5 : Vendor field change pe log kr k dkhna h k pageinit hit horha h ya nh
            //     //check10 : use pageinit remaining amount logic to following function click_partial_payment. Reason : second partial payment bnate waqt full payment wali lines ignor krdain.

            //     let vendorBillRecord = context.currentRecord;
            //     let vendorBillId = context.currentRecord.id;
            //     let noOfBillCredits = checkRelatedBillCredits(vendorBillId)

            //     let lineItemCount = vendorBillRecord.getLineCount({
            //         sublistId: 'item'
            //     });

            //     log.debug("count: ", lineItemCount);
            //     log.debug("vendorBillId: ", vendorBillId);

            //     for (let i = 0; i < lineItemCount; i++) {

            //         vendorBillRecord.selectLine({
            //             sublistId: 'item',
            //             line: i
            //         });

            //         let partialAmount = vendorBillRecord.getCurrentSublistValue({
            //             sublistId: 'item',
            //             fieldId: whtPartialPaymentAmountFld
            //         });

            //         let lineAmount = vendorBillRecord.getCurrentSublistValue({
            //             sublistId: 'item',
            //             fieldId: lineAmountFld
            //         });

            //         let taxCode = vendorBillRecord.getCurrentSublistValue({
            //             sublistId: 'item',
            //             fieldId: whtTaxCodeFld,

            //         });

            //         log.debug("partialAmount: ", partialAmount);
            //         log.debug("lineAmount: ", lineAmount);
            //         log.debug("taxCode: ", taxCode);


            //         // if (partialAmount) {

            //         if (taxCode) {

            //             let taxRate = getTaxRate(taxCode) //Check3 : remove this function

            //             let processedAmount = calculateRemainingBillAmount(vendorBillId, i + 1, parseFloat(taxRate))

            //             let remainingAmount = lineAmount - processedAmount;

            //             log.debug("remainingAmount: ", remainingAmount);

            //             remainingAmount <= 0 ? remainingAmount = 0 : remainingAmount

            //             //  currentRec.setCurrentSublistText({ sublistId: 'item', fieldId: whtRemainingAmountFld, text: remainingAmount.toFixed(2) });


            //             vendorBillRecord.setCurrentSublistValue({
            //                 sublistId: 'item',
            //                 fieldId: whtRemainingAmountFld,
            //                 value: remainingAmount.toFixed(2)
            //             });

            //             vendorBillRecord.commitLine({
            //                 sublistId: 'item'
            //             });
            //         }
            //         else {

            //             noOfBillCredits > 0 ?
            //                 (vendorBillRecord.setCurrentSublistValue({
            //                     sublistId: 'item',
            //                     fieldId: whtRemainingAmountFld,
            //                     value: 0
            //                 })) :
            //                 (vendorBillRecord.setCurrentSublistValue({
            //                     sublistId: 'item',
            //                     fieldId: whtRemainingAmountFld,
            //                     value: lineAmount.toFixed(2)
            //                 }))


            //             vendorBillRecord.commitLine({
            //                 sublistId: 'item'
            //             });
            //         }



            //         // }



            //     }


            // }

        }

        function calculateAndSetWhtFields(currentRec, sublistId, taxRate) {

            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxRateFld, value: parseFloat(taxRate).toFixed(2) });

            let actualAmount = currentRec.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: lineAmountFld,

            });

            let taxAmount = (parseFloat(taxRate) / 100) * actualAmount;

            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtBaseAmountFld, value: actualAmount - taxAmount });
            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxAmountFld, value: taxAmount });
            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtPartialWhtAmountFld, value: '' });
            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtPartialPaymentAmountFld, value: '' });

            log.debug("taxAmount : ", taxAmount)

            log.debug("rate : ", parseFloat(taxRate))

        }

        function calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate) {

            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxRateFld, value: parseFloat(taxRate).toFixed(2) });

            let partialAmount = currentRec.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: whtPartialPaymentAmountFld,

            });

            let taxAmount = (parseFloat(taxRate) / 100) * partialAmount;

            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtPartialWhtAmountFld, value: taxAmount });
            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtBaseAmountFld, value: '' });
            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxAmountFld, value: '' });

            log.debug("taxAmount : ", taxAmount)
            log.debug("rate : ", parseFloat(taxRate))

        }

        function clearWhtFields(currentRec, sublistId) {
            try {
                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtBaseAmountFld, value: '' });
                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxAmountFld, value: '' });

            } catch (error) {
                log.error({
                    title: `Error in ${context.type} ${context.currentRecord.type} fieldChanged event`,
                    details: error,
                });
            }

        }

        function clearRateAndRemainingAmountFields(currentRec, sublistId) {
            try {

                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxRateFld, value: '' });
                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtRemainingAmountFld, value: '' });

            } catch (error) {
                log.error({
                    title: `Error in ${context.type} ${context.currentRecord.type} fieldChanged event`,
                    details: error,
                });
            }

        }

        function clearPartialAmountFields(currentRec, sublistId) {
            try {

                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtPartialWhtAmountFld, value: '' });
                // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: isApplyWhtPartialAmountFld, value: false });
                currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtPartialPaymentAmountFld, value: '' });

            } catch (error) {
                log.error({
                    title: `Error in ${context.type} ${context.currentRecord.type} fieldChanged event`,
                    details: error,
                });
            }

        }

        // function getTaxRate(taxCode) {

        //     let taxCodeLookup = search.lookupFields({
        //         type: 'customrecord_wht_tax_code',
        //         id: taxCode,
        //         columns: 'custrecord_wht_rate',
        //     });

        //     return taxCodeLookup.custrecord_wht_rate[0].value;
        // }


        function getTaxRate(taxCode) {

            let customrecord_wht_tax_codeSearchObj = search.create({
                type: "customrecord_wht_tax_code",
                filters:
                    [
                        ["internalid", "anyof", taxCode]
                    ],
                columns:
                    [
                        "custrecord_wht_rate"
                    ]
            });


            let rate;

            customrecord_wht_tax_codeSearchObj.run().each(function (result) {

                rate = result.getValue("custrecord_wht_rate");

                return true;

            });

            log.debug("tax rate: ", rate);

            return rate


        }

        function fieldChanged(context) {
            let currentRec = currentRecord.get();
            let sublistId = context.sublistId;
            let fldId = context.fieldId;

            try {
                if (currentRec.type !== 'vendorbill' && currentRec.type !== 'check') return;

                if ((sublistId === 'item' || sublistId === 'expense') && fldId === whtTaxCodeFld) {

                    let taxCode = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtTaxCodeFld,
                    });

                    log.debug({ title: 'taxCode:', details: taxCode });

                    let isPartialPayment = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: isApplyWhtPartialAmountFld,
                    });

                    if (!taxCode) {
                        clearWhtFields(currentRec, sublistId);
                        clearPartialAmountFields(currentRec, sublistId);
                        clearRateAndRemainingAmountFields(currentRec, sublistId);
                        return;
                    }

                    let taxRate = getTaxRate(taxCode);

                    if (isPartialPayment) {
                        calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate);
                    } else {
                        calculateAndSetWhtFields(currentRec, sublistId, taxRate);
                    }

                } else if ((sublistId === 'item' || sublistId === 'expense') && fldId === whtPartialPaymentAmountFld) {

                    log.debug({ title: 'partial payment amount changed!' });

                    let partialAmount = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtPartialPaymentAmountFld,
                    });

                    if (!partialAmount) return;

                    let taxCode = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtTaxCodeFld,
                    });

                    let taxRate = getTaxRate(taxCode);

                    // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: isApplyWhtPartialAmountFld, value: true });

                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtPartialWhtAmountFld,
                        value: (parseFloat(taxRate) / 100) * partialAmount,
                    });

                    currentRec.setCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: isApplyWhtPartialAmountFld,
                        value: true,
                    });

                    clearWhtFields(currentRec, sublistId)

                    // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtBaseAmountFld, value: lineAmount - partialAmount });
                    // currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: whtTaxAmountFld, value: '' });

                    log.debug({ title: 'taxRate:', details: parseFloat(taxRate) });

                }
                else if ((sublistId === 'item' || sublistId === 'expense') && fldId === isApplyWhtPartialAmountFld) {


                    let taxCode = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtTaxCodeFld,
                    });

                    let taxRate = getTaxRate(taxCode);

                    let isPartialPayment = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: isApplyWhtPartialAmountFld,
                    });

                    if (!!isPartialPayment) {
                        clearWhtFields(currentRec, sublistId)
                    }
                    else {

                        clearPartialAmountFields(currentRec, sublistId);
                        calculateAndSetWhtFields(currentRec, sublistId, taxRate);

                    }



                }
                else if ((sublistId === 'item' || sublistId === 'expense') && (fldId === 'amount' || fldId === 'rate' || fldId === 'quantity')) {

                    console.log('amount field change')

                    let taxCode = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtTaxCodeFld,
                    });

                    if (!taxCode) return

                    let taxRate = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: whtTaxRateFld,
                    });

                    let isPartialPayment = currentRec.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: isApplyWhtPartialAmountFld,
                    });

                    if (isPartialPayment) {
                        calculateAndSetWhtPartialPayment(currentRec, sublistId, taxRate);
                    } else {
                        calculateAndSetWhtFields(currentRec, sublistId, taxRate);
                    }


                }

            } catch (e) {
                log.error({ title: 'Error executing fieldChanged:', details: e });
            }

        }




        function validateLine(context) {

            if (context.currentRecord.type == 'vendorbill') {

                let currentRecord = context.currentRecord;
                let sublistName = context.sublistId;

                if (sublistName == 'item') {

                    let amount = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: lineAmountFld });

                    let partialAmount = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: whtPartialPaymentAmountFld });

                    let remainingAmount = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: whtRemainingAmountFld });


                    log.debug("validate : amount", amount)
                    log.debug("validate : partialAmount", partialAmount)

                    log.debug("validate : remainingAmount", remainingAmount)

                    if (partialAmount > amount) {

                        dialog.alert({
                            title: 'Warning',
                            message: 'Partial amount can not exceed the amount!'
                        })

                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: whtPartialPaymentAmountFld, value: '' });

                        return false;

                    }
                    else if (partialAmount > remainingAmount) {

                        remainingAmount != '' || remainingAmount != 0 ? dialog.alert({
                            title: 'Warning', message: 'Please select the amount within available range!'
                        }) : true

                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: whtPartialPaymentAmountFld, value: '' });

                        return false;

                    }
                    else {
                        return true;
                    }



                }
            }

        }




        return {
            //check9 : validate line generating an error. tpartial payment amount becomes empty

            fieldChanged: fieldChanged,
            // validateLine: validateLine,
            pageInit: pageInit
        };

    }
);


