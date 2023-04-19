/**
 * @NApiVersion 2.1
 * @NModuleScope public
 * @description This file contains all the saved searches for the project.
 */

define(['N/search', 'N/record', 'N/format', 'N/runtime', 'N/url'], function (search, record, format, runtime, url) {

    function convertToNetsuiteDateFormat(dateString) {

        const currentUser = runtime.getCurrentUser();

        const netsuiteDateFormat = currentUser.getPreference({ name: 'DATEFORMAT' });

        log.debug("netsuiteDateFormat: ", netsuiteDateFormat);

        const parsedDate = format.parse({ value: dateString, type: format.Type.DATE, format: netsuiteDateFormat });

        const netsuiteDateString = format.format({ value: parsedDate, type: format.Type.DATE });

        return netsuiteDateString;
    }


    function formatDate(date) {
        if (!date) {
            return null;
        }

        try {
            return format.format({
                type: format.Type.DATE,
                value: date
            });
        } catch (e) {
            log.error({
                title: 'Error formatting date',
                details: e
            });

            return null;
        }
    }

    function parseDate(dateString) {
        var parts = dateString.split('/');
        if (parts.length !== 3) {
            log.error({
                title: 'Error parsing date string',
                details: 'Invalid date string: ' + dateString
            });
            return null;
        }

        var day = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10) - 1; // Months are zero-based in JavaScript Date object
        var year = parseInt(parts[2], 10);

        var dateObj = new Date(year, month, day);
        if (isNaN(dateObj)) {
            log.error({
                title: 'Error parsing date string',
                details: 'Invalid date string: ' + dateString
            });
            return null;
        }
        return dateObj;
    }


    function setBillPaymentAmount(rec) {
        let vendorPaymentRecord = rec


        var lineItemCount = vendorPaymentRecord.getLineCount({
            sublistId: 'apply'
        });

        log.debug('Before submit : linecount', lineItemCount);


        for (var i = 0; i < lineItemCount; i++) {

            let isChecked = vendorPaymentRecord.getSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                line: i
            });

            let currentBillId = vendorPaymentRecord.getSublistValue({
                sublistId: 'apply',
                fieldId: 'doc',
                line: i
            });

            if (isChecked) {

                let billPaymentAmount = calculateBillPaymentAmount(currentBillId);

                log.debug('billPaymentAmount Final', billPaymentAmount);

                vendorPaymentRecord.setSublistValue({
                    sublistId: 'apply',
                    fieldId: 'amount',
                    line: i,
                    value: billPaymentAmount
                });
            }


        }

    }

    function calculateBillPaymentAmount(billId) {

        let billPaymentAmount = 0;

        var billRecord = record.load({
            type: record.Type.VENDOR_BILL,
            id: billId,
            isDynamic: true
        });

        var isPartialPayment = billRecord.getText('custbody_ps_wht_pay_partially')

        log.debug("billId: ", billId);

        log.debug("isPartialPayment: ", isPartialPayment);

        var lineItemCount = billRecord.getLineCount({
            sublistId: 'item'
        });

        for (var i = 0; i < lineItemCount; i++) {

            let amount = parseFloat(billRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: i
            }));

            if (isPartialPayment == "F") {

                let baseAmount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_base_amount',
                    line: i
                }));

                log.debug("baseAmount : ", baseAmount);

                baseAmount ? (billPaymentAmount = billPaymentAmount + baseAmount)
                    : (billPaymentAmount = billPaymentAmount + amount)

            }
            else {
                let partialAmount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_wht_partial_payment_amount',
                    line: i
                }));

                let taxAmount = parseFloat(billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_partial_wht_amount',
                    line: i
                }));

                let remainingAmount = billRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_remaining_amount',
                    line: i
                });


                log.debug("partialAmount : ", partialAmount);
                log.debug("taxAmount : ", taxAmount);
                log.debug("amount : ", amount);

                let amountDifference = partialAmount - taxAmount;

                log.debug("amountDifference : ", amountDifference);

                if (partialAmount) {
                    billPaymentAmount = billPaymentAmount + amountDifference
                }
                else {
                    remainingAmount > 0 ?
                        (billPaymentAmount = billPaymentAmount + amount) : billPaymentAmount


                }

                // partialAmount ? (billPaymentAmount = billPaymentAmount + amountDifference)
                //     : (billPaymentAmount = billPaymentAmount + amount)

                log.debug("billPaymentAmount : ", billPaymentAmount);

            }



        }




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

    function openRecInNewWindow(recType, recId) {
        let recordUrl = url.resolveRecord({ recordType: recType, recordId: recId, isEditMode: false })
        window.open(recordUrl, '_blank');
    }



    return {
        setBillPaymentAmount,
        parseDate,
        formatDate,
        formatNumberWithCommas,
        convertToNetsuiteDateFormat,
        openRecInNewWindow
    }
});