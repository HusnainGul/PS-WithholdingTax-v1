/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/search'],
    function (nsCurrentRec, nsRecord, dialog, search) {


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

            // if (context.currentRecord.type == 'vendorbill' || context.currentRecord.type == 'check') {

            let currentRec = context.currentRecord;
            let sublistId = context.sublistId;
            let fieldId = context.fieldId;

            // log.debug("fieldId: ", fieldId);
            // log.debug("sublistId: ", sublistId);


            try {
                if (sublistId == 'item' || sublistId == 'expense') {

                    if (fieldId == 'custcol_ps_wht_tax_code') {

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

                    }

                    if (fieldId = 'custcol_ps_wht_apply_partial_payments') {

                        let isPartialPayment = currentRec.getCurrentSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custcol_ps_wht_apply_partial_payments',

                        });

                        log.debug("isPartialPayment: ", isPartialPayment);

                        if (isPartialPayment == true) {

                            let partialAmountFld = currentRec.getField({ fieldId: 'custcol_wht_partial_payment_amount' });
                            let taxCodeFld = currentRec.getField({ fieldId: 'custcol_ps_wht_tax_code' });
                            let taxRateFld = currentRec.getField({ fieldId: 'custcol_ps_wht_tax_rate' });
                            let baseAmountFld = currentRec.getField({ fieldId: 'custcol_ps_wht_base_amount' });
                            let taxAmountFld = currentRec.getField({ fieldId: 'custcol_ps_wht_tax_amount' });

                            log.debug("partialAmountFld", partialAmountFld)
                            log.debug("taxCodeFld", taxCodeFld)
                            log.debug("taxRateFld", taxRateFld)
                            log.debug("baseAmountFld", baseAmountFld)
                            log.debug("taxAmountFld", taxAmountFld)

                            partialAmountFld.isMandatory = true;
                            taxCodeFld.isMandatory = true;
                            taxRateFld.isMandatory = true;
                            baseAmountFld.isMandatory = true;
                            taxAmountFld.isMandatory = true;

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


                    log.debug("amount", amount)
                    log.debug("partialAmount", partialAmount)

                    if (partialAmount > amount) {

                        dialog.alert({
                            title: 'Warning',
                            message: 'Partial amount can not exceed the amount!'
                        })

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

            fieldChanged: fieldChanged,
            validateLine: validateLine,
            pageInit: pageInit
        };

    }
);


