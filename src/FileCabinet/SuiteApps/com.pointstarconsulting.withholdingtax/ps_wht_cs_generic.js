/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record', 'N/ui/dialog'],
    function (nsCurrentRec, nsRecord, dialog) {


        function pageInit(context) {

            if (context.currentRecord.type == 'customrecord_wht_tax_code') {

                var currentRec = context.currentRecord;

                let certificateSectionFld = currentRec.getField('custrecord_wht_tax_certificate_section');
                let incomeTypeField = currentRec.getField('custrecord_wht_income_type');

                certificateSectionFld.isDisplay = false;
                incomeTypeField.isDisplay = false;

            }

        }



        function fieldChanged(context) {


            if (context.currentRecord.type == 'customrecord_wht_tax_code') {

                let currentRec = context.currentRecord;
                let fieldId = context.fieldId;


                try {


                    if (fieldId == 'custrecord_wht_country_name') {

                        let country = currentRec.getText('custrecord_wht_country_name');

                        let certificateSectionFld = currentRec.getField('custrecord_wht_tax_certificate_section');

                        let incomeTypeField = currentRec.getField('custrecord_wht_income_type');

                        log.debug("country: ", country);

                        if (country == "Thailand" || country == "thailand" || country == "THAILAND") {


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

            // if (context.currentRecord.type == 'vendorbill') {

            //     var currentRec = context.currentRecord;
            //     var sublistId = context.sublistId;
            //     var fieldId = context.fieldId;
            //     var line = context.line;

            //     log.debug("fieldId: ", fieldId);
            //     log.debug("sublistId: ", sublistId);


            //     try {
            //         if (sublistId == 'item') {

            //             if (fieldId == 'custcol_wht_partial_payment_amount') {

            //                 var partialAmount = currentRec.getSublistValue({
            //                     sublistId: sublistId,
            //                     fieldId: 'custcol_wht_partial_payment_amount',
            //                     line: line
            //                 });

            //                 var amount = currentRec.getSublistValue({
            //                     sublistId: sublistId,
            //                     fieldId: 'amount',
            //                     line: line
            //                 });


            //                 log.debug("partialAmount: ", partialAmount);
            //                 log.debug("amount: ", amount);

            //                 if (partialAmount > amount) {

            //                     alert("Partial amount exceeding the actual amount!")

            //                     currentRec.setSublistValue({
            //                         sublistId: sublistId,
            //                         fieldId: 'custcol_wht_partial_payment_amount',
            //                         value: 0,
            //                         line: line
            //                     });

            //                     return false
            //                 }



            //             }

            //         }

            //     }
            //     catch (e) {
            //         console.error('Error::fieldChanged::' + fieldId, e);
            //         log.error('Error::fieldChanged::' + fieldId, e);
            //     }


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


