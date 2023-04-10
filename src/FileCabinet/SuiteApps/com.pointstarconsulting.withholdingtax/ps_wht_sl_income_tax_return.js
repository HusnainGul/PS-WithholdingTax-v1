/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/task'],
    function (ui, search, record, nstask) {

        function onRequest(context) {

            try {

                var request = context.request;
                var response = context.response;
                var params = request.parameters;


                if (request.method === 'GET') {
                    log.debug('GET params', params);
                    getHandler(request, response, params, context.request);
                } else {
                    postHandler(request, response, params);
                }
            } catch (e) {
                log.error('Error::onRequest', e);
                response.writeLine({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
            }

        } 

        function getHandler(request, response, params, context) {

            let printTypes = {
                "pnd3": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/PND.1.xml",
                "pnd3a": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/Templates/pnd3_attachemnt.xml",
                "pnd53": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/Templates/pnd53.xml",
                "pnd5a": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/Templates/pnd53_attachemnt.xml",
                "holdingtax": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/Templates/with_holding_tax.xml"
            }

            var form = ui.createForm({
                title: 'Withholding Income Tax Return'
            });

            form.addButton({
                id: 'custpage_cover_page',
                label: 'Cover Page (PDF)',
                functionName: `printPdf('coverpage')`
            });

            form.addButton({
                id: 'custpage_attachment',
                label: 'Attachment (PDF)',
                functionName: `printPdf('attachment')`
            });

            form.addButton({
                id: 'custpage_efilling',
                label: 'e-Filling (Text)'
            });

            form.addFieldGroup({
                id: 'custpage_wht_income_tax_return',
                label: 'Withholding Income Tax Return'
            });

            form.addFieldGroup({
                id: 'custpage_criteria',
                label: 'Criteria'
            });

            form.addFieldGroup({
                id: 'custpage_cover_page',
                label: 'Cover Page'
            });


            form.addFieldGroup({
                id: 'custpage_attachment',
                label: 'Attachment'
            });

            form.addFieldGroup({
                id: 'custpage_information',
                label: 'Information'
            });


            form.clientScriptModulePath = './ps_wht_cs_suitelets.js';

            var categoryField = form.addField({
                id: 'custpage_pnd_category_fld',
                type: ui.FieldType.SELECT,
                label: 'P.N.D Category',
                container: 'custpage_wht_income_tax_return'
            });

            var categoryList = getRecordsList('customrecord_wht_category');

            categoryList.map(function (option) {
                categoryField.addSelectOption({
                    value: option.name,
                    text: option.name
                });
            })


            var subsidiaryFld = form.addField({
                id: 'custpage_subsidiary_fld',
                type: ui.FieldType.SELECT,
                label: 'Subsidiary',
                container: 'custpage_criteria'
            });

            var subsidiaryList = getRecordsList('subsidiary');


            var subsidiaryBranchFld = form.addField({
                id: 'custpage_subs_branch_fld',
                type: ui.FieldType.SELECT,
                label: 'Subsidiary Branch',
                container: 'custpage_criteria'
            });

            subsidiaryList.map(function (option) {
                subsidiaryFld.addSelectOption({
                    value: option.name,
                    text: option.name
                });
                subsidiaryBranchFld.addSelectOption({
                    value: option.name,
                    text: option.name
                });
            })


            var whtPeriodFld = form.addField({
                id: 'custpage_wht_period_fld',
                type: ui.FieldType.SELECT,
                label: 'WHT Period',
                container: 'custpage_criteria'
            });

            var periodList = getRecordsList('accountingperiod');

            periodList.map(function (option) {
                whtPeriodFld.addSelectOption({
                    value: option.name,
                    text: option.name
                });
            })



            var whtFilingStatusFld = form.addField({
                id: 'custpage_wht_filing_status_fld',
                type: ui.FieldType.SELECT,
                label: 'WHT Filing Status',
                container: 'custpage_criteria'
            });

            var filingStatusList = getRecordsList('customrecord_wht_filing_status');

            filingStatusList.map(function (option) {
                whtFilingStatusFld.addSelectOption({
                    value: option.name,
                    text: option.name
                });
            })


            var accountingBookFld = form.addField({
                id: 'custpage_wht_acc_book_fld',
                type: ui.FieldType.SELECT,
                label: 'Accounting Book',
                container: 'custpage_criteria'
            });

            var accountingBookList = getRecordsList('accountingbook');

            accountingBookList.map(function (option) {
                accountingBookFld.addSelectOption({
                    value: option.name,
                    text: option.name
                });
            })


            var surchargeFld = form.addField({
                id: 'custpage_wht_surcharge_fld',
                type: ui.FieldType.TEXT,
                label: 'Surcharge',
                container: 'custpage_cover_page'
            });


            var surchargeFld = form.addField({
                id: 'custpage_total_attch_fld',
                type: ui.FieldType.TEXT,
                label: 'Total Attachment Page',
                container: 'custpage_cover_page'
            });



            var attachmentFld = form.addField({
                id: 'custpage_show_wht_cert_fld',
                type: ui.FieldType.CHECKBOX,
                label: 'Show WHT Certificate No',
                container: 'custpage_attachment'
            });



            var informationFld = form.addField({
                id: 'custpage_information_fld',
                type: ui.FieldType.INLINEHTML,
                label: 'Information',
                container: 'custpage_information'
            });


            informationFld.defaultValue = '<p>e-filing program, manual and troubleshooting</p>'




            response.writePage(form);




        }


        function postHandler(request, response) {


        }

        function getRecordsList(type) {
            try {

                var customrecord_wht_categorySearchObj = search.create({
                    type: type,
                    filters:
                        [
                        ],
                    columns:
                        [
                            "internalid", "name"
                        ]
                });
                var reportResults = customrecord_wht_categorySearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });

                var internalId;
                var name;
                var data = [];

                for (var i in reportResults) {
                    internalId = reportResults[i].getValue('internalid')
                    name = reportResults[i].getValue('name')
                    data.push({ id: internalId, name: name })
                }

                log.debug("data: ", data)

                return data

            }

            catch (e) {
                log.debug("error: ", e.message)
                return [{ id: '', name: '' }]
            }

        }



        return {
            onRequest: onRequest
        };
    });