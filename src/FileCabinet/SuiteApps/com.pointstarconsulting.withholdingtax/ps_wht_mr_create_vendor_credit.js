/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define(['N/search', 'N/record', 'N/config', './modules/moment.js', 'N/format', 'N/runtime', './lib/helper_lib.js'],
    function (search, record, config, moment, format, runtime, helper) {


        function isPartialPayment(billId) {

            var billRecord = record.load({
                type: record.Type.VENDOR_BILL,
                id: billId,
                isDynamic: true
            });

            var isPartialPayment = billRecord.getText('custbody_ps_wht_pay_partially');

            return isPartialPayment

        }


        function getItemId(taxCode) {

            log.debug("tax Code::", taxCode);
            var itemSearchObj = search.create({
                type: "item",
                filters:
                    [
                        ["name", "is", taxCode]
                    ],
                columns:
                    [
                        "internalid"
                    ]
            });

            let itemId;

            itemSearchObj.run().each(function (result) {

                itemId = result.getValue('internalid')

            });

            log.debug("itemId: ", itemId)

            return itemId
        }


        function updateQueueStatus(billCreditId, queueId, exception) {
            log.debug("billCreditId Updtae Queue Status:", billCreditId);
            log.debug("queueId:", queueId);

            if (!exception) {
                var submitFields = {};
                submitFields['custrecord_ps_wht_queue_status'] = 'Done';
                submitFields['custrecord_ps_wht_result'] = billCreditId;

                log.debug("submitFields", submitFields);

                record.submitFields({
                    type: 'customrecord_ps_wht_job',
                    id: queueId,
                    values: submitFields,
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    }
                });
            }
            else { //exception
                log.error("exception:", exception);
                var submitFields = {};
                submitFields['custrecord_ps_wht_queue_status'] = 'Error';
                submitFields['custrecord_ps_wht_result'] = exception;

                log.debug("submitFields", submitFields);

                record.submitFields({
                    type: 'customrecord_ps_wht_job',
                    id: queueId,
                    values: submitFields,
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    }
                });

            }

        }

        function clearPartialPaymentField(billdata) {

            let billId = billdata.internalId;

            var billRecord = record.load({
                type: record.Type.VENDOR_BILL,
                id: billId,
                isDynamic: true
            });

            var lineItemCount = billRecord.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < lineItemCount; i++) {

                billRecord.selectLine({
                    sublistId: 'item',
                    line: i
                });

                billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_partial_wht_amount', value: '' });
                billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_wht_partial_payment_amount', value: '' });
                // billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_apply_partial_payments', value: false });

                billRecord.commitLine({
                    sublistId: 'item'
                });

            }

            billRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });

        }

        function transformVendorBillToCredit(billdata) {

            log.debug("fromId : ", billdata.internalId);

            // let partialPayment = isPartialPayment(billdata.internalId)


            let billCreditRecord = record.transform({
                fromType: record.Type.VENDOR_BILL,
                fromId: billdata.internalId,
                toType: record.Type.VENDOR_CREDIT
            });

            let totalLines = billCreditRecord.getLineCount({
                sublistId: 'item'
            });


            // let billDate = helper.formatDate(helper.parseDate(billdata.date))
            let billDate = helper.convertToNetsuiteDateFormat(billdata.date)

            log.debug("billDate: ", billDate);

            billdata.date ? billCreditRecord.setText({
                fieldId: 'trandate',
                text: billDate
            }) : log.error("Error : Trandate not found on Bill Payment!")



            let taxLinesObj = {};
            let billLineNoObj = {};
            let taxAmount;

            for (var i = 0; i < totalLines; i++) {

                let partialPayment = billCreditRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_apply_partial_payments',
                    line: i
                });

                log.debug("partialPayment: ", partialPayment);

                if (partialPayment == false) {
                    taxAmount = parseFloat(billCreditRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_tax_amount',
                        line: i
                    }));

                    log.debug("partialPayment == false");
                }
                else {
                    taxAmount = parseFloat(billCreditRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_ps_wht_partial_wht_amount',
                        line: i
                    }));
                    log.debug("partialPayment == true");
                }

                let taxCode = billCreditRecord.getSublistText({
                    sublistId: 'item',
                    fieldId: 'custcol_ps_wht_tax_code',
                    line: i
                });

                let lineNo = billCreditRecord.getSublistText({
                    sublistId: 'item',
                    fieldId: 'line',
                    line: i
                });

                log.debug("taxAmount" + i, taxAmount);

                if (taxAmount > 0) {
                    taxLinesObj[lineNo] = taxAmount;

                    billLineNoObj[lineNo] = taxCode;
                }


            }

            log.debug("taxLinesObj final: ", taxLinesObj);
            log.debug("billLineNoObj final: ", billLineNoObj);


            for (var i = totalLines - 1; i >= 0; i--) {

                billCreditRecord.removeLine({
                    sublistId: 'item',
                    line: i,
                    ignoreRecalc: true
                });

            }

            let lineNo = 0;
            for (const key in billLineNoObj) {
                if (billLineNoObj.hasOwnProperty(key)) {

                    const taxCode = billLineNoObj[key];
                    const billLineNo = key;
                    const taxAmount = taxLinesObj[key];
                    // const billLineNo = billLineNoObj[key];

                    // log.debug("taxCode: ", taxCode)
                    // log.debug("billLineNo: ", billLineNo)
                    // log.debug("taxAmount: ", taxAmount)

                    if (taxCode) {

                        let itemToSet = getItemId(taxCode)

                        billCreditRecord.insertLine({
                            sublistId: 'item',
                            line: lineNo,
                        });

                        billdata.location ? billCreditRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: billdata.location,
                            line: lineNo
                        }) : log.error("Error : Location not found on Bill Payment!")

                        billCreditRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: itemToSet,
                            line: lineNo
                        })

                        billCreditRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_ps_wht_bill_line_no',
                            value: billLineNo,
                            line: lineNo
                        })


                        billCreditRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: taxAmount,
                            line: lineNo
                        })

                        billCreditRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: taxAmount,
                            line: lineNo
                        })

                        log.debug("Credit Amnt" + lineNo, taxAmount);

                        lineNo++;
                    }
                }
            }


            let applySublistLineCount = billCreditRecord.getLineCount({
                sublistId: 'apply'
            });

            for (var i = 0; i < applySublistLineCount; i++) {

                let doc = billCreditRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'doc',
                    line: i
                });

                // log.debug("doc: ", doc);
                // log.debug("billdata.internalId: ", billdata.internalId);

                if (doc == billdata.internalId) {

                    billCreditRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        value: false,
                        line: i
                    })

                    billCreditRecord.setSublistValue({
                        sublistId: 'apply',
                        fieldId: 'apply',
                        value: true,
                        line: i
                    })

                }

            }


            let billCreditId = billCreditRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });

            log.debug({
                title: 'Bill Credit Created',
                details: 'Bill Credit ID: ' + billCreditId
            });

            return billCreditId
        }



        function getRecordsToProcess() {
            var finalResult = [];
            try {
                var queueSearch = search.create({
                    type: 'customrecord_ps_wht_job',
                    columns:
                        [
                            search.createColumn({ name: "name", sort: search.Sort.DESC, label: "Name" }),
                            search.createColumn({ name: "custrecord_ps_wht_vendor_credit_data", label: "Vendor Credit Data" })
                        ],
                    filters: [
                        ["custrecord_ps_wht_vendor_credit_data", "isnotempty", ""],
                        "AND",
                        ["custrecord_ps_wht_queue_status", "is", "pending"]

                    ]
                });

                var results = queueSearch.run().getRange({ start: 0, end: 1000 });

                log.debug("Results : ", results);
                log.debug("Results lenght : ", results.length);

                for (var i = 0; i < results.length; i++) {
                    var data = results[i].getValue({ name: 'custrecord_ps_wht_vendor_credit_data' });
                    data = JSON.parse(data);
                    log.debug("data: ", data);
                    finalResult.push({
                        queueId: results[i].id,
                        internalId: data.internalid,
                        date: data.trandate,
                        location: data.location
                    });

                }

                log.debug('finalResult', finalResult);
                return finalResult;

            } catch (e) {
                log.error('Error::getRecordsToProcess', e);
            }

        }



        function getInputData() {

            var billRecords = getRecordsToProcess();


            log.debug("getRecordsToProcess: ", billRecords)
            log.debug("No of Records To Process: ", billRecords.length)

            return billRecords;
        }

        function map(context) {

            try {

                var searchResult = JSON.parse(context.value);

                log.debug("searchResult: ", searchResult);

                let billCreditId = transformVendorBillToCredit(searchResult);

                clearPartialPaymentField(searchResult)

                updateQueueStatus(billCreditId, searchResult.queueId)

            }

            catch (exception) {
                log.error("Error : ", exception.message)
                updateQueueStatus(billCreditId, searchResult.queueId, exception.message)
            }
            finally {
                context.write({
                    key: context.key,
                    value: searchResult.soId
                });
            }


        }







        function reduce(context) {
            // log.debug('reduce key : ', context.key);
            // log.debug('reduce value: ', context.values);

            // context.write({
            //     key: context.key,
            //     value: context.values
            // });

        }

        function summarize(summary) {

            log.debug('summarize yields : ', summary.yields);
            log.debug('summarize concurrency : ', summary.concurrency);
            log.debug('summarize usage : ', summary.usage);


        }



        return {
            getInputData: getInputData,
            map: map,
            // reduce: reduce,
            summarize: summarize
        }
    }
);

