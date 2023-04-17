/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search', 'N/task'],

    function (record, search, task) {


        return {





            afterSubmit: function (context) {


                if (context.newRecord.type == 'vendorpayment') {

                    log.debug("After submit : vendorpayment...");

                    let vendorPaymentId = context.newRecord.id;

                    let vendorBills = getVendorBillData(vendorPaymentId)


                    for (var i = 0; i < vendorBills.length; i++) {

                        var queueId = createQueueRecord(vendorBills[i]);

                        log.debug("queueId: ", queueId);

                    }


                    var taskId = triggerDownload();

                    //transformVendorBillToCredit(vendorBillId)



                }


                function triggerDownload() {

                    var taskObj = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: 'customscript_ps_wht_mr_create_credit'
                    });

                    return taskObj.submit();

                }

                function createQueueRecord(data) {

                    try {


                        var queueRec = record.create({
                            type: 'customrecord_ps_wht_job'
                        });

                        queueRec.setValue({ fieldId: 'custrecord_ps_wht_queue_status', value: 'pending' });
                        queueRec.setValue({ fieldId: 'custrecord_ps_wht_vendor_credit_data', value: JSON.stringify(data) });


                        return queueRec.save({ enableSourcing: true, ignoreMandatoryFields: true });
                    }

                    catch (e) {
                        log.error('Error::createQueueRecord', e);
                    }


                }


                function getBillDate(billId) {


                    var vendorbillSearchObj = search.create({
                        type: "vendorbill",
                        filters:
                            [
                                ["type", "anyof", "VendBill"],
                                "AND",
                                ["internalid", "anyof", billId]
                            ],
                        columns:
                            [
                                "trandate"
                            ]
                    });
                    var billDate;

                    vendorbillSearchObj.run().each(function (result) {

                        billDate = result.getValue("trandate")

                        return true;

                    });

                    log.debug("billDate: ", billDate)

                    return billDate

                }

                function getVendorBillData(billPaymentId) {

                    log.debug("billPaymentId: ", billPaymentId);

                    var vendorpaymentSearchObj = search.create({
                        type: "vendorpayment",
                        filters:
                            [
                                ["type", "anyof", "VendPymt"],
                                "AND",
                                ["internalid", "anyof", billPaymentId],
                                "AND",
                                ["mainline", "is", "F"]
                            ],
                        columns:
                            [
                                "appliedtotransaction",
                                "location",
                                "trandate"
                            ]
                    });

                    var vendorBill = [];

                    vendorpaymentSearchObj.run().each(function (result) {

                        vendorBill.push({
                            internalid: result.getValue("appliedtotransaction"),
                            trandate: getBillDate(result.getValue("appliedtotransaction")),
                            location: result.getValue("location")
                        })

                        return true;

                    });

                    log.debug("vendorBill: ", vendorBill)

                    return vendorBill


                }



            }

            ,

            beforeSubmit: function (context) {

                if (context.newRecord.type == 'vendorpayment') {

                    let vendorPaymentId = context.newRecord.id;
                    let vendorPaymentRecord = context.newRecord;


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

                            let billPaymentAmount = getBillPaymentAmount(currentBillId);

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

                function formatNumberWithCommas(number) {
                    var decimalPlaces = 2;
                    var numberString = parseFloat(number).toFixed(decimalPlaces);
                    var parts = numberString.split(".");
                    var integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    var decimalPart = parts.length > 1 ? "." + parts[1] : "";
                    return integerPart + decimalPart;
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

                                let remainingAmount; //to be set on vendor bill

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

                                // log.audit('currentRemainingAmount===0', currentRemainingAmount === 0)
                                // log.audit('currentRemainingAmount===""', currentRemainingAmount === '')
                                // log.audit('currentRemainingAmount==0', currentRemainingAmount == 0)
                                // log.audit('currentRemainingAmount===""', currentRemainingAmount == '')
                                // log.audit('currentRemainingAmount===undefined', currentRemainingAmount === undefined)
                                // log.audit('currentRemainingAmount===null', currentRemainingAmount === null)
                                // log.audit('currentRemainingAmount==undefined', currentRemainingAmount == undefined)
                                // log.audit('currentRemainingAmount==null', currentRemainingAmount == null)

                                if (currentRemainingAmount > 0) {

                                    billPaymentAmount += amountDifference
                                    remainingAmount = currentRemainingAmount - partialAmount
                                    log.audit('currentRemainingAmount > 0', billPaymentAmount)
                                    log.audit('remainingAmount > 0', remainingAmount)
                                }

                                if (currentRemainingAmount === 0) {

                                    billPaymentAmount = billPaymentAmount
                                    remainingAmount = currentRemainingAmount
                                    log.audit('currentRemainingAmount === 0', billPaymentAmount)
                                    log.audit('remainingAmount === 0', remainingAmount)
                                }

                                if (currentRemainingAmount === '') {

                                    billPaymentAmount += amountDifference
                                    remainingAmount = amount - partialAmount;
                                    log.audit('currentRemainingAmount ==="" ', billPaymentAmount)
                                    log.audit('remainingAmount === ""', remainingAmount)
                                }


                                log.debug("billPaymentAmount : ", billPaymentAmount);

                                // let remainingAmount = currentRemainingAmount ?
                                //     (currentRemainingAmount - partialAmount)
                                //     : (amount - partialAmount)


                                billRecord.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });

                                billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_remaining_amount', value: formatNumberWithCommas(remainingAmount) });
                                // billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_partial_wht_amount', value: '' });
                                // billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_wht_partial_payment_amount', value: '' });

                                billRecord.commitLine({
                                    sublistId: 'item'
                                });

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

                                // (currentRemainingAmount > 0) || (currentRemainingAmount == '') ? (billPaymentAmount = billPaymentAmount + baseAmount) : billPaymentAmount


                                if (currentRemainingAmount > 0) {

                                    billPaymentAmount += baseAmount
                                    remainingAmount = currentRemainingAmount - baseAmount - taxAmount

                                    log.audit('currentRemainingAmount > 0', billPaymentAmount)
                                }

                                if (currentRemainingAmount === 0) {

                                    billPaymentAmount = billPaymentAmount
                                    remainingAmount = currentRemainingAmount

                                    log.audit('currentRemainingAmount === 0', billPaymentAmount)
                                }

                                if (currentRemainingAmount === '') {

                                    billPaymentAmount += baseAmount
                                    remainingAmount = amount - baseAmount - taxAmount;

                                    log.audit('currentRemainingAmount ==="" ', billPaymentAmount)
                                }


                                // let remainingAmount = currentRemainingAmount ?
                                //     (currentRemainingAmount - baseAmount - taxAmount)
                                //     : (amount - baseAmount - taxAmount)

                                billRecord.selectLine({
                                    sublistId: 'item',
                                    line: i
                                });


                                billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_remaining_amount', value: formatNumberWithCommas(remainingAmount) });

                                // billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_partial_wht_amount', value: '' });
                                // billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_wht_partial_payment_amount', value: '' });


                                billRecord.commitLine({
                                    sublistId: 'item'
                                });
                            }
                        }
                        else {

                            currentRemainingAmount === '' ? (billPaymentAmount = billPaymentAmount + amount) : billPaymentAmount

                            billRecord.selectLine({
                                sublistId: 'item',
                                line: i
                            });

                            billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_remaining_amount', value: formatNumberWithCommas(0) });

                            billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_ps_wht_partial_wht_amount', value: '' });
                            billRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_wht_partial_payment_amount', value: '' });

                            billRecord.commitLine({
                                sublistId: 'item'
                            });
                        }

                    }




                    billRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });

                    return billPaymentAmount

                }

            }



        }


    }


);