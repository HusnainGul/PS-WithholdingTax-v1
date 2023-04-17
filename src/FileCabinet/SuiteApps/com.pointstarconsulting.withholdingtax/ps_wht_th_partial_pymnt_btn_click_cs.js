/**
 * @NApiVersion 2.1 
 * @NScriptType ClientScript
 */

define(['N/ui/dialog', 'N/url', 'N/search', 'N/record', 'N/ui/message', 'N/https', 'N/currentRecord', 'N/runtime', './lib/helper_lib.js'],
    function (dialog, url, search, record, message, http, currentRec, runtime, helperLib) {

        var Processing_Text = 'Processing';

        function pageInit(context) {

            console.log("page init ");

            return true

        }



        function createPartialPaymentOnClick(recordId) {

            console.log("button clicked!");

            let billPaymentId = createPartialBillPayment(recordId)
            helperLib.openRecInNewWindow('vendorpayment', billPaymentId)

            // open bill payment in new window
            return true
        }

        function createPartialBillPayment(billId) {

            log.debug("billId", billId)

            var billPaymentRecord = record.transform({
                fromType: "vendorbill",
                fromId: billId,
                toType: "vendorpayment",
                isDynamic: true,
            });

         //   helperLib.setBillPaymentAmount(billPaymentRecord)

            var billPaymentId = billPaymentRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });
            console.log("billPaymentId", billPaymentId)
            log.debug("billPaymentId", billPaymentId)
            helperLib.openRecInNewWindow('vendorpayment',billPaymentId)
            return billPaymentId

        }




        return {
            pageInit,
            createPartialPaymentOnClick
        };

    }


);

