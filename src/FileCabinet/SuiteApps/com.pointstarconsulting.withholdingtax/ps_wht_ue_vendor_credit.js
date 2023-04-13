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
                            trandate: result.getValue("trandate"),
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

                            let billPaymentAmount = getBillPaymenAmount(currentBillId);

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


                function getBillPaymenAmount(billId) {

                    let billPaymentAmount = 0;

                    var billRecord = record.load({
                        type: record.Type.VENDOR_BILL,
                        id: billId,
                        isDynamic: true
                    });

                    // var isPartialPayment = billRecord.getText('custbody_ps_wht_pay_partially')
                    var isPartialPayment = billRecord.getValue('custbody_ps_wht_pay_partially')

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

                        if (isPartialPayment == false) {

                            let baseAmount = parseFloat(billRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_wht_base_amount',
                                line: i
                            }));

                            log.debug("baseAmount : ", baseAmount);

                            baseAmount ? (billPaymentAmount = billPaymentAmount + baseAmount)
                                : (billPaymentAmount = billPaymentAmount + amount)

                        }

                        else if (isPartialPayment == true) {

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

            }

        }


    }


);