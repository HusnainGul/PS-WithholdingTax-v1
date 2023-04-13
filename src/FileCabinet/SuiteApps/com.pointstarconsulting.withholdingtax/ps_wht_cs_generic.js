/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/search'],
    function (nsCurrentRec, nsRecord, dialog, search) {


        function checkRelatedBillCredits(billId) {
            let noOfBillCredits;
            if (billId) {
                var vendorcreditSearchObj = search.create({
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

                var results = vendorcreditSearchObj.run().getRange({ start: 0, end: 1000 });

                (results.length > 0) ? noOfBillCredits = results.length : noOfBillCredits = 0;

            }

            log.debug("noOfBillCredits: ", noOfBillCredits);

            return noOfBillCredits

        }


        function calculateRemainingBillAmount(billId, lineNo, whtRate) {

            log.debug("billId::", billId);

            if (billId && lineNo && whtRate) {

                var vendorcreditSearchObj = search.create({
                    type: "vendorcredit",
                    filters:
                        [
                            ["type", "anyof", "VendCred"],
                            "AND",
                            ["createdfrom.internalid", "anyof", billId]
                        ],
                    columns:
                        [
                            "type",
                            "tranid",
                            "amount",
                            "custcol_ps_wht_bill_line_no"
                        ]
                });

                var results = vendorcreditSearchObj.run().getRange({ start: 0, end: 1000 });

                let billCreditAmount = 0;
                let billPaymentAmount = 0;

                log.debug("Results : ", results);
                log.debug("Results lenght : ", results.length);

                for (var i = 0; i < results.length; i++) {
                    let billLineNo = results[i].getValue({ name: 'custcol_ps_wht_bill_line_no' });

                    if (billLineNo == lineNo) {

                        let amount = parseFloat(results[i].getValue({ name: 'amount' }));

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

            var customrecord_wht_countrySearchObj = search.create({
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

            if (context.currentRecord.type == 'customrecord_wht_tax_code') {

                var currentRec = context.currentRecord;

                let certificateSectionFld = currentRec.getField('custrecord_wht_tax_certificate_section');
                let incomeTypeField = currentRec.getField('custrecord_wht_income_type');

                let countryFld = currentRec.getValue('custrecord_wht_country_name');
                let countryId = getCountryId('thailand');

                if (countryFld != countryId) {
                    certificateSectionFld.isDisplay = false;
                    incomeTypeField.isDisplay = false;

                }


            }


            if (context.currentRecord.type == 'vendorbill') {

                //Check1 : context.mode = edit
                //Check2 : partialPayment checkbox
                //Check4 : Make Copy pe context pe, Remaining amount empty krwani hai
                //Check5 : Vendor field change pe log kr k dkhna h k pageinit hit horha h ya nh
                //check10 : use pageinit remaining amount logic to following function click_partial_payment. Reason : second partial payment bnate waqt full payment wali lines ignor krdain.

                let vendorBillRecord = context.currentRecord;
                let vendorBillId = context.currentRecord.id;
                let noOfBillCredits = checkRelatedBillCredits(vendorBillId)

                var lineItemCount = vendorBillRecord.getLineCount({
                    sublistId: 'item'
                });

                log.debug("count: ", lineItemCount);
                log.debug("vendorBillId: ", vendorBillId);

                for (var i = 0; i < lineItemCount; i++) {

                    vendorBillRecord.selectLine({
                        sublistId: 'item',
                        line: i
                    });

                    let partialAmount = vendorBillRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_wht_partial_payment_amount'
                    });

                    let lineAmount = vendorBillRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount'
                    });

                    let taxCode = vendorBillRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_tax_code',

                    });

                    log.debug("partialAmount: ", partialAmount);
                    log.debug("lineAmount: ", lineAmount);
                    log.debug("taxCode: ", taxCode);


                    // if (partialAmount) {

                    if (taxCode) {

                        let taxRate = getTaxRate(taxCode) //Check3 : remove this function

                        let processedAmount = calculateRemainingBillAmount(vendorBillId, i + 1, parseFloat(taxRate))

                        let remainingAmount = lineAmount - processedAmount;

                        log.debug("remainingAmount: ", remainingAmount);

                        remainingAmount <= 0 ? remainingAmount = 0 : remainingAmount

                        //  currentRec.setCurrentSublistText({ sublistId: 'item', fieldId: 'custcol_ps_wht_remaining_amount', text: remainingAmount.toFixed(2) });


                        vendorBillRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ps_wht_remaining_amount',
                            value: remainingAmount.toFixed(2)
                        });

                        vendorBillRecord.commitLine({
                            sublistId: 'item'
                        });
                    }
                    else {

                        noOfBillCredits > 0 ?
                            (vendorBillRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_wht_remaining_amount',
                                value: 0
                            })) :
                            (vendorBillRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_wht_remaining_amount',
                                value: lineAmount.toFixed(2)
                            }))


                        vendorBillRecord.commitLine({
                            sublistId: 'item'
                        });
                    }



                    // }



                }


            }

        }

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


            if (context.currentRecord.type == 'customrecord_wht_tax_code') {

                let currentRec = context.currentRecord;
                let fieldId = context.fieldId;


                try {


                    if (fieldId == 'custrecord_wht_country_name') {


                        log.debug("check: ");

                        let countryFld = currentRec.getValue('custrecord_wht_country_name');
                        let countryId = getCountryId('thailand');
                        let certificateSectionFld = currentRec.getField('custrecord_wht_tax_certificate_section');

                        let incomeTypeField = currentRec.getField('custrecord_wht_income_type');

                        log.debug("countryFld: ", countryFld);
                        log.debug("countryId: ", countryId);

                        if (countryFld == countryId) {

                            certificateSectionFld.isDisplay = true;
                            incomeTypeField.isDisplay = true;

                        }
                        else {

                            certificateSectionFld.isDisplay = false;
                            incomeTypeField.isDisplay = false;

                        }



                    }



                }
                catch (e) {
                    console.error('Error::fieldChanged::' + fieldId, e);
                    log.error('Error::fieldChanged::' + fieldId, e);
                }

            }

            //check6 : open these comments

            // if (context.currentRecord.type == 'vendorbill' || context.currentRecord.type == 'check') {

            let currentRec = context.currentRecord;
            let currentRecId = context.currentRecord.id;
            let sublistId = context.sublistId;
            let fieldId = context.fieldId;
            var currentLine = context.line;

            // log.debug("fieldId: ", fieldId);
            // log.debug("sublistId: ", sublistId);


            try {
                if (sublistId == 'item' || sublistId == 'expense') {

                    console.log("check");

                    if (fieldId == 'custcol_ps_wht_tax_code') {

                        //check8 : agr isPayment checked hai to hi uski fields ayain or sath me base or wht wali empty hojaen. remaininig bh hide 

                        let taxCode = currentRec.getCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_tax_code',

                        });

                        log.debug("taxCode: ", taxCode);

                        // var isPartialPayment = currentRec.getText('custbody_ps_wht_pay_partially');


                        let isPartialPayment = currentRec.getCurrentSublistText({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_apply_partial_payments',

                        });

                        // log.debug("isPartialPayment: ", isPartialPayment);

                        if (taxCode) {

                            let taxRate = getTaxRate(taxCode)

                            if (isPartialPayment == "F") {

                                //Check7 : use getValue instead of getText

                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', text: taxRate });

                                let actualAmount = currentRec.getCurrentSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'amount',

                                });

                                let taxAmount = (parseFloat(taxRate) / 100) * actualAmount;

                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_base_amount', text: actualAmount - taxAmount });
                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_amount', text: taxAmount });
                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: '' });
                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_wht_partial_payment_amount', text: '' });

                                log.debug("taxAmount : ", taxAmount)

                                log.debug("rate : ", parseFloat(taxRate))

                            }
                            else {

                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', text: taxRate });

                                let partialAmount = currentRec.getCurrentSublistValue({
                                    sublistId: sublistId,
                                    fieldId: 'custcol_wht_partial_payment_amount',

                                });

                                let taxAmount = (parseFloat(taxRate) / 100) * partialAmount;

                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: taxAmount });
                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_base_amount', text: '' });
                                currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_amount', text: '' });

                                log.debug("taxAmount : ", taxAmount)

                                log.debug("rate : ", parseFloat(taxRate))
                            }

                        }
                        else {

                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_base_amount', text: '' });
                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_amount', text: '' });
                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: '' });
                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_wht_partial_payment_amount', text: '' });
                            currentRec.setCurrentSublistValue({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', value: '' });
                        }

                    }

                    if (fieldId == 'custcol_wht_partial_payment_amount') {

                        log.debug("partial payment amount changed!");
                        console.log("partial payment amount changed!");

                        let partialAmount = currentRec.getCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_wht_partial_payment_amount',

                        });

                        let lineAmount = currentRec.getCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'amount',

                        });

                        log.debug("partialAmount: ", partialAmount);
                        console.log("partialAmount: ", partialAmount);



                        if (partialAmount) {

                            let taxCode = currentRec.getCurrentSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custcol_ps_wht_tax_code',

                            });

                            log.debug("taxCode: ", taxCode);
                            console.log("taxCode: ", taxCode);

                            let taxRate = getTaxRate(taxCode)

                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_apply_partial_payments', text: "T" })

                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', text: taxRate });

                            let taxAmount = (parseFloat(taxRate) / 100) * partialAmount;

                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: taxAmount });
                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_base_amount', text: '' });
                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_amount', text: '' });

                            log.debug("taxAmount : ", taxAmount)

                            log.debug("rate : ", parseFloat(taxRate))

                            log.debug("lineAmount : ", lineAmount)

                            // let processedAmount = calculateRemainingBillAmount(currentRecId, currentLine + 1, parseFloat(taxRate))

                            // let remainingAmount = lineAmount - processedAmount;

                            // log.debug("remainingAmount: ", remainingAmount);
                            // remainingAmount <= 0 ? remainingAmount = 0 : true
                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_remaining_amount', text: remainingAmount.toFixed(2) });

                            // log.debug("currentLine", currentLine);
                            // log.debug("currentRecId", currentRecId);




                        }
                        else {
                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_apply_partial_payments', text: "F" })

                            currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: "" })

                        }

                    }


                    if (fieldId == 'custcol_ps_wht_apply_partial_payments') {

                        let partialAmount = currentRec.getCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_apply_partial_payments',

                        });

                        log.debug("partialAmount: ", partialAmount);

                        let taxCode = currentRec.getCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_tax_code',

                        });

                        log.debug("taxCode: ", taxCode);

                        let taxRate = getTaxRate(taxCode)

                        if (partialAmount == false) {

                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_code', text: '' })


                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_apply_partial_payments', text: "T" })

                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', text: taxRate });

                            // let taxAmount = (parseFloat(taxRate) / 100) * partialAmount;

                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: taxAmount });
                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_base_amount', text: '' });
                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_amount', text: '' });

                            // log.debug("taxAmount : ", taxAmount)

                            // log.debug("rate : ", parseFloat(taxRate))



                            // let partialAmountFld = currentRec.getField({ fieldId: 'custcol_wht_partial_payment_amount' });
                            // let taxCodeFld = currentRec.getField({ fieldId: 'custcol_ps_wht_tax_code' });
                            // let taxRateFld = currentRec.getField({ fieldId: 'custcol_ps_wht_tax_rate' });
                            // let baseAmountFld = currentRec.getField({ fieldId: 'custcol_ps_wht_base_amount' });
                            // let taxAmountFld = currentRec.getField({ fieldId: 'custcol_ps_wht_tax_amount' });

                            // log.debug("partialAmountFld", partialAmountFld)
                            // log.debug("taxCodeFld", taxCodeFld)
                            // log.debug("taxRateFld", taxRateFld)
                            // log.debug("baseAmountFld", baseAmountFld)
                            // log.debug("taxAmountFld", taxAmountFld)

                            // partialAmountFld.isMandatory = true;
                            // taxCodeFld.isMandatory = true;
                            // taxRateFld.isMandatory = true;
                            // baseAmountFld.isMandatory = true;
                            // taxAmountFld.isMandatory = true;

                        }
                        else {

                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_rate', text: taxRate });

                            // let actualAmount = currentRec.getCurrentSublistValue({
                            //     sublistId: sublistId,
                            //     fieldId: 'amount',

                            // });

                            // let taxAmount = (parseFloat(taxRate) / 100) * actualAmount;

                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_base_amount', text: actualAmount - taxAmount });
                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_tax_amount', text: taxAmount });
                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_ps_wht_partial_wht_amount', text: '' });
                            // currentRec.setCurrentSublistText({ sublistId: sublistId, fieldId: 'custcol_wht_partial_payment_amount', text: '' });

                            // log.debug("taxAmount : ", taxAmount)

                            // log.debug("rate : ", parseFloat(taxRate))

                        }





                    }



                }

            }
            catch (e) {
                console.error('Error::fieldChanged::' + fieldId, e);
                log.error('Error::fieldChanged::' + fieldId, e);
            }


            // }

        }




        function validateLine(context) {

            if (context.currentRecord.type == 'vendorbill') {

                let currentRecord = context.currentRecord;
                let sublistName = context.sublistId;

                if (sublistName == 'item') {

                    let amount = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'amount' });

                    let partialAmount = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custcol_wht_partial_payment_amount' });

                    let remainingAmount = currentRecord.getCurrentSublistValue({ sublistId: sublistName, fieldId: 'custcol_ps_wht_remaining_amount' });


                    log.debug("validate : amount", amount)
                    log.debug("validate : partialAmount", partialAmount)

                    log.debug("validate : remainingAmount", remainingAmount)

                    if (partialAmount > amount) {

                        dialog.alert({
                            title: 'Warning',
                            message: 'Partial amount can not exceed the amount!'
                        })

                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custcol_wht_partial_payment_amount', value: '' });

                        return false;

                    }
                    else if (partialAmount > remainingAmount) {

                        remainingAmount != '' || remainingAmount != 0 ? dialog.alert({
                            title: 'Warning', message: 'Please select the amount within available range!'
                        }) : true

                        currentRecord.setCurrentSublistValue({ sublistId: sublistName, fieldId: 'custcol_wht_partial_payment_amount', value: '' });

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


