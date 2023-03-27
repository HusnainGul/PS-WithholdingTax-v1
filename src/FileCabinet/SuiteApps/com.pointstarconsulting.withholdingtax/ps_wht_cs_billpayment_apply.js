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

            if (searchParams.has("bill")) {

                searchParams.delete("bill");


                var updatedSearchString = searchParams.toString();


                var updatedUrl = currentUrl.replace(window.location.search, "");


                if (updatedSearchString) {
                    updatedUrl += "?currentBill=" + currentBillId + "&" + updatedSearchString;
                }

                log.debug("updatedUrl: ", updatedUrl);

                window.location.href = updatedUrl;


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

            if (urlParams.has("currentBill")) {
                currentBillId = urlParams.get('currentBill')
            }


            log.debug("currentRec", currentRec)
            log.debug("sublistId", sublistId)


            log.debug("currentBillId", currentBillId)


            try {
                if (sublistId == 'apply') {
                    log.audit("sublist");

                    if (fieldId == 'apply') {


                        var billNo = currentRec.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'doc',
                            line: line
                        });

                        var totalAmount = currentRec.getValue('total')

                        log.debug("totalAmount: ", totalAmount);

                        log.debug("billNo: ", billNo);

                        if (currentBillId == billNo) {


                            var partialAmount = getPartialPaymentsSum(currentBillId);

                            if (partialAmount > 0) {

                                log.debug("in condition...")


                                // currentRec.setValue('total', partialAmount)

                                nlapiSetFieldValue('total', partialAmount)
                                // let rec = context.currentRecord;

                                // rec.setSublistValue({
                                //     sublistId: 'apply',
                                //     fieldId: 'amount',
                                //     line: 7,
                                //     value: 10000
                                // });



                                nlapiSetLineItemValue(sublistId, "amount", line + 1, partialAmount)
                                nlapiSetLineItemValue(sublistId, "disc", line + 1, totalAmount - partialAmount)



                                // currentRec.selectLine(sublistId, line);

                                // currentRec.setCurrentSublistValue(sublistId, 'total', 12345);

                                // currentRec.commitLine(sublistId);



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


        function getPartialPaymentsSum(billId) {

            var sum = 0;

            var billRecord = nsRecord.load({
                type: nsRecord.Type.VENDOR_BILL,
                id: billId,
                isDynamic: true
            });
            var lineItemCount = billRecord.getLineCount({
                sublistId: 'item'
            });


            for (var i = 0; i < lineItemCount; i++) {

                let partialAmnt = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_wht_partial_payment_amount',
                    line: i
                }));

                // log.debug("partialAmnt: ", partialAmnt);

                partialAmnt ? sum = sum + partialAmnt : 1

            }

            log.debug("partial sum: ", sum);


            return sum

        }


        return {

            fieldChanged: fieldChanged,
            pageInit: pageInit

        };

    }
);


