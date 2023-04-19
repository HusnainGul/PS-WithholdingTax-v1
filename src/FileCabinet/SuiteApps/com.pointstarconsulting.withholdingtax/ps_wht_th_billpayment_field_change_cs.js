/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


const applySublist = 'apply';
const itemSublistId = 'item';
const applyField = 'apply';
const docField = 'doc';
const amountField = 'amount';

const amountItemField = 'amount';
const taxCodeItemField = 'custcol_ps_wht_tax_code';
const isPartialPaymentItemField = 'custcol_ps_wht_apply_partial_payments';
const remainingAmountItemField = 'custcol_ps_wht_remaining_amount';
const partialAmountItemField = 'custcol_wht_partial_payment_amount';
const partialTaxAmountItemField = 'custcol_ps_wht_partial_wht_amount';
const baseAmountItemField = 'custcol_ps_wht_base_amount';
const taxAmountItemField = 'custcol_ps_wht_tax_amount';


define(['N/currentRecord', 'N/record', './lib/helper_lib'],
    function (nsCurrentRec, nsRecord, helper_lib) {


        function pageInit(context) {
            var currentRec = context.currentRecord;
            var currentUrl = window.location.href;
            var searchParams = new URLSearchParams(window.location.search);
            const currentBillId = searchParams.get('bill')

            const entityId = searchParams.get('entity')

            log.debug("entityId: ", entityId)

            if (entityId) {
                currentRec.setValue("entity", entityId)
            }

        }

        function fieldChanged(context) {

            var currentRec = context.currentRecord;
            var sublistId = context.sublistId;
            var fieldId = context.fieldId;
            var line = context.line;

            var queryString = window.location.search
            const urlParams = new URLSearchParams(queryString);

            var currentBillId;

            if (urlParams.has("bill")) {
                currentBillId = urlParams.get('bill')
            }


            console.log(currentRec)


            try {
                if (sublistId == 'apply') {
                    log.audit("sublist");

                    if (fieldId == 'apply') {


                        var applyFld = currentRec.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line: line
                        });

                        if (applyFld) {

                            var billNo = currentRec.getSublistValue({
                                sublistId: 'apply',
                                fieldId: 'doc',
                                line: line
                            });

                            var type = currentRec.getSublistValue({
                                sublistId: 'apply',
                                fieldId: 'trantype',
                                line: line
                            });
                            console.log("type", type)

                            if (type == "VendBill") {


                                var totalAmount = currentRec.getValue('total')

                                log.debug("totalAmount: ", totalAmount);

                                log.debug("billNo: ", billNo);


                                let billPaymentAmount = getBillPaymenAmount(billNo);

                                console.log(billPaymentAmount)

                                if (billPaymentAmount > 0) {

                                    log.debug("in condition...")

                                    log.debug("Line no : ", line + 1)

                                    document.getElementById('amount' + (line + 1) + '_formattedValue').value = helper_lib.formatNumberWithCommas(billPaymentAmount)

                                }

                            }



                        }

                    }

                }

            }
            catch (e) {
                console.error('Error::fieldChanged::' + fieldId, e);
                log.error('Error::fieldChanged::' + fieldId, e);
            }

        }


        function getBillPaymenAmount(billId) {

            let billPaymentAmount = 0;

            var billRecord = nsRecord.load({
                type: nsRecord.Type.VENDOR_BILL,
                id: billId,
                isDynamic: true
            });

            var total = billRecord.getValue({ fieldId: 'total' });

            var lineItemCount = billRecord.getLineCount({
                sublistId: itemSublistId
            });


            for (var i = 0; i < lineItemCount; i++) {

                let amount = parseFloat(billRecord.getSublistValue({
                    sublistId: itemSublistId,
                    fieldId: amountItemField,
                    line: i
                }));

                let taxCode = billRecord.getSublistValue({
                    sublistId: itemSublistId,
                    fieldId: 'custcol_ps_wht_tax_code',
                    line: i
                });
                let isPartialPayment = billRecord.getSublistValue({
                    sublistId: itemSublistId,
                    fieldId: isPartialPaymentItemField,
                    line: i
                });

                if (!!taxCode) {
                    let currentRemainingAmount = parseFloat(billRecord.getSublistValue({
                        sublistId: itemSublistId,
                        fieldId: remainingAmountItemField,
                        line: i
                    }));

                    let baseAmount = parseFloat(billRecord.getSublistValue({
                        sublistId: itemSublistId,
                        fieldId: 'custcol_ps_wht_base_amount',
                        line: i
                    }));

                    if (!!isPartialPayment) {
                        billPaymentAmount += getPartialAmount(billRecord, i, itemSublistId, amount, currentRemainingAmount)
                    }
                    else {
                        billPaymentAmount += getBaseAmount(billRecord, i, itemSublistId, amount, currentRemainingAmount)
                    }



                    // baseAmount == '' ? baseAmount = 0 : true

                    // log.debug("baseAmount : ", baseAmount);

                    // billPaymentAmount = billPaymentAmount + baseAmount;


                }
                else {

                    if (!!isPartialPayment) {

                        let partialAmount = parseFloat(billRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_wht_partial_payment_amount',
                            line: i
                        }));

                        partialAmount == '' ? partialAmount = 0 : true

                        billPaymentAmount += partialAmount

                    }

                    else {

                        let amount = parseFloat(billRecord.getSublistValue({
                            sublistId: itemSublistId,
                            fieldId: 'amount',
                            line: i
                        }));

                        amount == '' ? amount = 0 : true

                        log.debug("amount : ", amount);

                        billPaymentAmount = billPaymentAmount + amount;
                    }
                }




            }

            log.debug("billPaymentAmount : ", billPaymentAmount);


            return billPaymentAmount

        }




        function getPartialAmount(billRecord, lineIndex, itemSublistId, amount, currentRemainingAmount) {
            let partialAmount = parseFloat(billRecord.getSublistValue({
                sublistId: itemSublistId,
                fieldId: partialAmountItemField,
                line: lineIndex
            }));

            let partialTaxAmount = parseFloat(billRecord.getSublistValue({
                sublistId: itemSublistId,
                fieldId: partialTaxAmountItemField,
                line: lineIndex
            }));

            console.log(partialAmount - partialTaxAmount)

            let amountDifference = partialAmount - partialTaxAmount;


            return amountDifference
        }

        function getBaseAmount(billRecord, lineIndex, itemSublistId, amount, currentRemainingAmount) {

            let baseAmount = parseFloat(billRecord.getSublistValue({
                sublistId: itemSublistId,
                fieldId: baseAmountItemField,
                line: lineIndex
            }));

            log.debug("baseAmount : ", baseAmount);
            logger("baseAmount : ", baseAmount);

            let taxAmount = parseFloat(billRecord.getSublistValue({
                sublistId: itemSublistId,
                fieldId: taxAmountItemField,
                line: lineIndex
            }));

            //    let amountDifference = baseAmount - taxAmount;

            //  log.debug("billPaymentAmount : ", amountDifference);

            return baseAmount
        }

        function logger(title, variable) {
            return console.log(title, variable)
        }
        // function validateLine(context) {


        //     var currentRec = context.currentRecord;
        //     var sublistId = context.sublistId;
        //     var fieldId = context.fieldId;
        //     var line = context.line;

        //     try {
        //         if (sublistId == 'apply') {


        //             if (fieldId == 'apply') {


        //                 var applyFld = currentRec.getSublistValue({
        //                     sublistId: 'apply',
        //                     fieldId: 'amount'
        //                 });



        //                 log.debug("validate field: ", applyFld);

        //                 if (applyFld) {

        //                     alert('check validation')
        //                     return true

        //                 }




        //             }

        //         }

        //     }
        //     catch (e) {
        //         console.error('Error::fieldChanged::' + fieldId, e);
        //         log.error('Error::fieldChanged::' + fieldId, e);
        //     }
        // }



        return {

            fieldChanged: fieldChanged,
            pageInit: pageInit,
            //   validateLine: validateLine

        };

    }
);


