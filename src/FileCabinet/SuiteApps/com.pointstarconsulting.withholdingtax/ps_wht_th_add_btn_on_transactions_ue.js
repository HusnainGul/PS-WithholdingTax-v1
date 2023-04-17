

/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(['N/record'],

    function (record) {


        return {

            beforeLoad: function (context) {

                if (context.newRecord.type == 'vendorbill') {

                    if (context.type === context.UserEventType.CREATE) {
                        return;
                    }

                    let recordId = context.newRecord.id;
                    let vendorBillRecord = context.newRecord;

                    let billStatus = vendorBillRecord.getText('statusRef')

                    log.debug("status:", billStatus);

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

                    }
                    else {
                        vendorBillRecord.setText('custbody_ps_wht_pay_partially', "F")
                    }



                    if (context.type === context.UserEventType.VIEW) {

                        if (applyPartialPayment) {

                            context.form.addButton({
                                id: "custpage_btn_partial_payment",
                                label: 'Make Partial Payment',
                                functionName: 'createPartialPaymentOnClick("' + recordId + '")'
                            })

                            context.form.removeButton('payment');

                            context.form.clientScriptModulePath = 'SuiteApps/com.pointstarconsulting.withholdingtax/ps_wht_th_partial_pymnt_btn_click_cs.js'

                        }


                        if (billStatus == 'paidInFull') {
                            context.form.removeButton('custpage_btn_partial_payment');
                        }


                    }


                }



            }




        }


    }


);