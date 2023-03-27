

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


            }



        }


    }


);