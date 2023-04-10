/**
 * @NApiVersion 2.1 
 * @NScriptType ClientScript
 */

define(['N/ui/dialog', 'N/url', 'N/search', 'N/record', 'N/ui/message', 'N/https', 'N/currentRecord', 'N/runtime'],
    function (dialog, url, nsSearch, record, nsMessage, http, nsCurrentRec, runtime) {

        var Processing_Text = 'Processing';

        function pageInit(context) {

            log.debug("page init");
            log.audit("page init");
            console.log("page init ");

            alert("hello world");
            return true

        }

        function onclick_Load(recordId) {

            log.debug("button clicked!");

            console.log("button clicked!");


            window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=holdingtax";



            return true
        }


        function click_partial_payment(recordId) {

            log.debug("button clicked!");

            console.log("button clicked!");

            alert(recordId)

            let billPaymentId = createPartialBillPayment(recordId)

            //  window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=holdingtax";

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

            log.debug("billPaymentRecord", billPaymentRecord)


            var billPaymentId = billPaymentRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

            log.debug("billPaymentId", billPaymentId)
        }




        return {
            pageInit,
            onclick_Load,
            click_partial_payment
        };

    }


);

