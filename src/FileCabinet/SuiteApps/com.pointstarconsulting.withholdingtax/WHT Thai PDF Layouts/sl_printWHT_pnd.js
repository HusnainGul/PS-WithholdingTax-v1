/**
* @NApiVersion 2.1
* @NScriptType Suitelet
*/

define([
  'N/render',
  'N/file',
  'N/search',
  'N/redirect',
  'N/url',
  'N/task',
  'N/https',
  'N/encode',
  'N/runtime',
  'N/record',
  'N/encode'

], function (render, file, search, redirect, url, task, https, encode, runtime, record, encode,) {

  function onRequest(context) {
    var request = context.request;
    var res = context.response;
    let param = request.parameters;

    if (context.request.method === "GET") {

      // var internalID = param.recId

      // log.debug("param ", param)

      // toLoad = record.load({
      //   id: internalID,
      //   type: 'itemfulfillment',
      //   isDynamic: true
      // });

      // let tranid = toLoad.getText({ fieldId: 'tranid' });
      // let tranDate = toLoad.getText({ fieldId: 'trandate' });
      // let fromLocation = toLoad.getText({ fieldId: 'location' });
      // let toLocation = toLoad.getText({ fieldId: 'transferlocation' });
      // let amount = toLoad.getText({ fieldId: 'total' });
      // let transferOrderInternalId = toLoad.getValue({ fieldId: 'createdfrom' });

      // let totalQuantity = 0

      // let recordDataArray = []

      // log.debug("amount ", amount)



      // sublistCount = toLoad.getLineCount({ sublistId: "item" })

      // for (var i = 0; i < sublistCount; i++) {
      //   var obj = {
      //     "item": toLoad.getSublistText({ sublistId: 'item', fieldId: 'itemname', line: i }),
      //     "quantity": toLoad.getSublistText({ sublistId: 'item', fieldId: 'quantity', line: i }),
      //     "rate": toLoad.getSublistText({ sublistId: 'item', fieldId: 'rate', line: i }),
      //     "description": toLoad.getSublistText({ sublistId: 'item', fieldId: 'description', line: i }),
      //     "amount": toLoad.getSublistText({ sublistId: 'item', fieldId: 'amount', line: i })
      //   }
      //   log.debug("item ", toLoad.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }))

      //   totalQuantity += parseInt(toLoad.getSublistText({ sublistId: 'item', fieldId: 'quantity', line: i }))
      //   recordDataArray.push(obj)
      // }

      let templateData = {
        internalID: "cdd",
      }

      let printTypes = {
        "pnd3": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/PND.1.xml",
        "pnd5": "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/wht_thai.xml"
      }
      var printType = param.type
      fileURL = printTypes[printType]
      log.debug("fileURL", fileURL)

      var renderObj = render.create();

      const xmlFileUrl = fileURL;

      xml_layoutFile = file.load({
        id: xmlFileUrl
      })
      var xml_fileContent = xml_layoutFile.getContents();

      renderObj.templateContent = xml_fileContent


      renderObj.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'data',
        data: templateData,
      })

      const renderPDFLayout = renderObj.renderAsString();

      context.response.renderPdf(renderPDFLayout)

      // log.debug("renderPDFLayout", renderPDFLayout)

      // var authString = "TJHzVA0G1doSkbeG0O9Wc8hUhqcaX9_OaMxP3RK5Kec" + ":" + "1P2o3i4n5t";
      // var encodedAuthString = encode.convert({
      //   string: authString,
      //   inputEncoding: encode.Encoding.UTF_8,
      //   outputEncoding: encode.Encoding.BASE_64
      // });


      // pdf = render.xmlToPdf({
      //   xmlString: renderPDFLayout
      // })

      // pdf.folder = 6076

      // var cret = pdf.save();
      // pdfFile = file.load({
      //   id: cret
      // })

      // var pdfFile_Content = pdfFile.getContents();

      // // log.debug("base_64", cret)

      // var base_64 = encode.convert({
      //   string: pdfFile_Content,
      //   inputEncoding: encode.Encoding.UTF_8,
      //   outputEncoding: encode.Encoding.BASE_64
      // });

      // log.debug("base_64", base_64)


      // var headers = {};
      // headers.Authorization = 'Basic ' + encodedAuthString;
      // headers.Accept = "*/*";

      // var response = https.post({
      //   url: 'https://api.printnode.com/printjobs/',
      //   headers: headers,
      //   body: JSON.stringify({
      //     "printerId": 71741700,
      //     "title": "My Test PrintJob",
      //     "contentType": "pdf_base64",
      //     "content": pdfFile_Content,
      //     "source": "api documentation!"
      //   })
      // });

      // // apiResponse = JSON.parse(JSON.stringify(apiResponse));
      // log.debug("check response.code", response)

      // context.response.renderPdf(renderPDFLayout)

    }
    else {

    }
  }


  return {
    onRequest: onRequest
  }

});
