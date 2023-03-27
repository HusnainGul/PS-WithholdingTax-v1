/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record', 'N/search'],

    function (record, search) {


        return {

            afterSubmit: function (context) {

                if (context.newRecord.type == 'vendorpayment') {

                    log.debug("After submit : vendorpayment...");

                    let vendorPaymentId = context.newRecord.id;

                    let vendorBillData = getVendorBillData(vendorPaymentId)

                    vendorBillData.map(function (data) {

                        transformVendorBillToCredit(data)

                    })


                }




                function getVendorBillData(billPaymentId) {

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

                function transformVendorBillToCredit(billdata) {

                    let billCreditRecord = record.transform({
                        fromType: record.Type.VENDOR_BILL,
                        fromId: billdata.internalid,
                        toType: record.Type.VENDOR_CREDIT
                    });

                    let totalLines = billCreditRecord.getLineCount({
                        sublistId: 'item'
                    });

                    log.debug("total Lines : ", totalLines)

                    billdata.trandate ? billCreditRecord.setText({
                        fieldId: 'trandate',
                        text: billdata.trandate
                    }) : log.error("Error : Trandate not found on Bill Payment!")



                    for (var i = 0; i < totalLines; i++) {

                        billdata.location ? billCreditRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: billdata.location,
                            line: i
                        }) : log.error("Error : Location not found on Bill Payment!")

                    }

                    log.debug("total Lines : ", totalLines)

                    let billCreditId = billCreditRecord.save({ enableSourcing: true, ignoreMandatoryFields: true });

                    log.debug({
                        title: 'Bill Credit Created',
                        details: 'Bill Credit ID: ' + billCreditId
                    });

                    return billCreditId
                }


            }



        }


    }


);