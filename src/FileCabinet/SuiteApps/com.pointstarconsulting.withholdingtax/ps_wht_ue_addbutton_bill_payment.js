

/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record'],

    function (record) {


        return {

            beforeLoad: function (context) {

                if (context.newRecord.type == 'vendorpayment') {

                    let recordId = context.newRecord.id;

                    context.form.addButton({
                        id: "custpage_btn_process",
                        label: 'Print Certificate',
                        functionName: 'onclick_Load("' + recordId + '")'
                    })

                    context.form.clientScriptModulePath = 'SuiteApps/com.pointstarconsulting.withholdingtax/ps_wht_cs_clickbutton.js'

                }

                if (context.newRecord.type == 'vendorbill') {

                    if (context.type === context.UserEventType.VIEW) {

                        let recordId = context.newRecord.id;
                        let vendorBillRecord = context.newRecord;

                        var lineItemCount = vendorBillRecord.getLineCount({
                            sublistId: 'item'
                        });

                        log.debug('Before submit : linecount', lineItemCount);

                        let applyPartialPayment = false;

                        for (var i = 0; i < lineItemCount; i++) {

                            applyPartialPayment = vendorBillRecord.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_ps_wht_apply_partial_payments',
                                line: i
                            });

                            log.debug("applyPartialPayment", applyPartialPayment)
                            if (applyPartialPayment) {
                                break;
                            }


                        }

                        if (applyPartialPayment) {

                            vendorBillRecord.setText('custbody_ps_wht_pay_partially', "T")

                            context.form.addButton({
                                id: "custpage_btn_partial_payment",
                                label: 'Make Partial Payment',
                                functionName: 'click_partial_payment("' + recordId + '")'
                            })

                            context.form.removeButton('payment');

                            context.form.clientScriptModulePath = 'SuiteApps/com.pointstarconsulting.withholdingtax/ps_wht_cs_clickbutton.js'

                        }
                        else {
                            vendorBillRecord.setText('custbody_ps_wht_pay_partially', "F")
                        }


                    }
                }



            }




        }


    }


);