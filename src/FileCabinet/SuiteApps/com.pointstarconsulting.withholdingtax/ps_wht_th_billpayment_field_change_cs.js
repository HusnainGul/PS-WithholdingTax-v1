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
    function (nsCurrentRec, record, helper_lib) {


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


                                let billPaymentAmount = getBillPaymentAmount(billNo);

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

        function getBillPaymentAmount(billId) {

            let billPaymentAmount = 0;

            var billRecord = record.load({
                type: record.Type.VENDOR_BILL,
                id: billId,
                isDynamic: true
            });

            log.debug("billId: ", billId);

            var lineItemCount = billRecord.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < lineItemCount; i++) {

                let amount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                }));

                let taxCode = billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_tax_code',
                    line: i
                });

                let isPartialPayment = billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_apply_partial_payments',
                    line: i
                });

                let currentRemainingAmount = billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_remaining_amount',
                    line: i
                })

                log.audit("261 currentRemainingAmount", currentRemainingAmount);


                if (currentRemainingAmount) {
                    let value = currentRemainingAmount.toString().replace(/,/g, "")
                    currentRemainingAmount = parseFloat(value)
                }

                log.audit("273 currentRemainingAmount", currentRemainingAmount);

                if (!!taxCode) {


                    if (!!isPartialPayment) {

                        let partialAmount = parseFloat(billRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_wht_partial_payment_amount',
                            line: i
                        }));

                        let partialTaxAmount = parseFloat(billRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ps_wht_partial_wht_amount',
                            line: i
                        }));

                        log.debug("partialAmount : ", partialAmount);
                        log.debug("partialTaxAmount : ", partialTaxAmount);
                        log.debug("amount : ", amount);

                        let amountDifference = partialAmount - partialTaxAmount;

                        log.debug("amountDifference : ", amountDifference);

                        // (currentRemainingAmount > 0) || (currentRemainingAmount == '') ? (billPaymentAmount = billPaymentAmount + amountDifference) : billPaymentAmount

                        log.audit('currentRemainingAmount', currentRemainingAmount)


                        if (currentRemainingAmount > 0) {

                            billPaymentAmount += amountDifference
                            log.audit('currentRemainingAmount > 0', billPaymentAmount)
                        }

                        if (currentRemainingAmount === 0) {

                            billPaymentAmount = billPaymentAmount
                            log.audit('currentRemainingAmount === 0', billPaymentAmount)

                        }

                        if (currentRemainingAmount === '') {

                            billPaymentAmount += amountDifference
                            log.audit('currentRemainingAmount ==="" ', billPaymentAmount)

                        }


                        log.debug("billPaymentAmount : ", billPaymentAmount);

                    }
                    else {

                        let baseAmount = parseFloat(billRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ps_wht_base_amount',
                            line: i
                        }));

                        log.debug("baseAmount : ", baseAmount);

                        let taxAmount = parseFloat(billRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ps_wht_tax_amount',
                            line: i
                        }));


                        if (currentRemainingAmount > 0) {

                            billPaymentAmount += baseAmount

                            log.audit('currentRemainingAmount > 0', billPaymentAmount)
                        }

                        if (currentRemainingAmount === 0) {

                            billPaymentAmount = billPaymentAmount

                            log.audit('currentRemainingAmount === 0', billPaymentAmount)
                        }

                        if (currentRemainingAmount === '') {

                            billPaymentAmount += baseAmount

                            log.audit('currentRemainingAmount ==="" ', billPaymentAmount)
                        }

                    }
                }
                else {

                    if (!!isPartialPayment) {


                        let partialAmount = parseFloat(billRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_wht_partial_payment_amount',
                            line: i
                        }));



                        if (currentRemainingAmount > 0) {

                            billPaymentAmount += partialAmount

                            log.audit('currentRemainingAmount > 0', billPaymentAmount)

                        }

                        if (currentRemainingAmount === 0) {

                            billPaymentAmount = billPaymentAmount

                            log.audit('currentRemainingAmount === 0', billPaymentAmount)

                        }

                        if (currentRemainingAmount === '') {

                            billPaymentAmount += partialAmount

                            log.audit('currentRemainingAmount ==="" ', billPaymentAmount)

                        }


                        log.debug("billPaymentAmount : ", billPaymentAmount);




                    }
                    else {

                        currentRemainingAmount === '' ? (billPaymentAmount = billPaymentAmount + amount) : billPaymentAmount


                    }


                }

            }




            billRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });

            return billPaymentAmount

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


