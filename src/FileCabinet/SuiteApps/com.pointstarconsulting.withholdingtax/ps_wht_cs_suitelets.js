/** 
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope public 
 */


define(['N/currentRecord', 'N/record'],
    function (nsCurrentRec, nsRecord) {



        function pageInit(context) {

            console.log("page init!");

        }


        // function printCoverPage(context) {
        //     var currentRecord = context.currentRecord;
        //     var categoryValue = currentRecord.getValue('custpage_pnd_category_fld');
        //     console.log(categoryValue)
        //     if (categoryValue === 'P.N.D.3') {
        //         window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=pnd3";
        //     } else if (categoryValue === 'P.N.D.53') {
        //         window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=pnd53";
        //     }
        // }


        function printPdf(type) {

            console.log("printPdf!");

            let pndCategory = document.getElementById('inpt_custpage_pnd_category_fld1').value;

            console.log("pndCategory: ", pndCategory);
            console.log("type: ", type);

            if (type === 'coverpage' && pndCategory === 'P.N.D.3') {
                window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=pnd3";
            }
            else if (type === 'attachment' && pndCategory === 'P.N.D.3') {
                window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=pnd3a";
            }
            else if (type === 'coverpage' && pndCategory === 'P.N.D 53') {
                window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=pnd53";
            }
            else if (type === 'attachment' && pndCategory === 'P.N.D 53') {
                window.location.href = "https://tstdrv2397753.app.netsuite.com/app/site/hosting/scriptlet.nl?script=68&deploy=1&type=pnd53a";
            }
        }


        return {

            pageInit: pageInit,
            printPdf: printPdf
        };

    }
);


