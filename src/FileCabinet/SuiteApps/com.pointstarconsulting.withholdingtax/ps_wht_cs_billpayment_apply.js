/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record'],
    function (nsCurrentRec, nsRecord) {


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

            // if (entityId) { nlapiChangeCall({ entity: entityId }); }

            //first option for reload

            // if (searchParams.has("bill")) {

            //     searchParams.delete("bill");


            //     var updatedSearchString = searchParams.toString();


            //     var updatedUrl = currentUrl.replace(window.location.search, "");


            //     if (updatedSearchString) {
            //         updatedUrl += "?currentBill=" + currentBillId + "&" + updatedSearchString;
            //     }

            //     log.debug("updatedUrl: ", updatedUrl);

            //     window.location.href = updatedUrl;


            // }

            //second option for reload

            // if (currentBillId) {
            //     setWindowChanged(window, false);
            //     window.onbeforeunload = null;
            //     var href = document.location.href;
            //     href = removeParamFromURL(href, 'inv');
            //     href = removeParamFromURL(href, 'bill');
            //     href = addParamToURL(href, 'custpage_id', currentBillId, true);
            //     document.location = href;

            // }












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


            log.debug("currentRec", currentRec)
            log.debug("sublistId", sublistId)

            log.debug("line", line)

            log.debug("currentBillId", currentBillId)


            try {
                if (sublistId == 'apply') {
                    log.audit("sublist");

                    if (fieldId == 'apply') {


                        var applyFld = currentRec.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'apply',
                            line: line
                        }); 



                        log.debug("apply fld : ", applyFld);

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

                                if (billPaymentAmount > 0) {

                                    log.debug("in condition...")

                                    log.debug("Line no : ", line + 1)


                                    document.getElementById('amount' + (line + 1) + '_formattedValue').value = formatNumberWithCommas(billPaymentAmount)

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
                sublistId: 'item'
            });


            for (var i = 0; i < lineItemCount; i++) {

                // let partialAmnt = parseFloat(billRecord.getSublistValue({
                //     sublistId: 'item',
                //     fieldId: 'custcol_wht_partial_payment_amount',
                //     line: i
                // }));

                // // log.debug("partialAmnt: ", partialAmnt);

                // partialAmnt ? sum = sum + partialAmnt : 1
                let whtTaxCode = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_tax_code',
                    line: i
                }));
                if (!whtTaxCode) {
                    return total
                }



                let taxAmount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_tax_amount',
                    line: i
                }));


                let baseAmount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_base_amount',
                    line: i
                }));

                // log.debug("taxAmount : ", taxAmount);
                log.debug("baseAmount : ", baseAmount);

                // let amount = baseAmount - taxAmount

                // log.debug("amount : ", amount);

                billPaymentAmount = billPaymentAmount + baseAmount;


            }

            log.debug("billPaymentAmount : ", billPaymentAmount);


            return billPaymentAmount

        }

        function formatNumberWithCommas(number) {
            var decimalPlaces = 2;
            var numberString = parseFloat(number).toFixed(decimalPlaces);
            var parts = numberString.split(".");
            var integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            var decimalPart = parts.length > 1 ? "." + parts[1] : "";
            return integerPart + decimalPart;
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


