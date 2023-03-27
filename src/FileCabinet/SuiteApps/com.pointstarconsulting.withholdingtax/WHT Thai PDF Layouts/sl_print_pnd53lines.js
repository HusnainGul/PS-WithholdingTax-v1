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

], function (render, file, search, redirect, url, task, https, encode, runtime, record, encode) {




  function onRequest(context) {
    var request = context.request;
    var res = context.response;
    let param = request.parameters;

    if (context.request.method === "GET") {


      let templateData = {
        internalID: "cdd",
      }

      var renderObj = render.create();
      const xmlFileUrl = "SuiteApps/com.pointstarconsulting.withholdingtax/WHT Thai PDF Layouts/pnd_53_lines.xml";

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

    }
    else {

    }
  }


  return {
    onRequest: onRequest
  }

});
