/**
 * HTTP function that supports CORS requests.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
'use strict'
const {BigQuery} = require('@google-cloud/bigquery');
const bigQuery = new BigQuery({
  projectId: 'betfred-gcp'
});

exports.get_payload_from_gtm_and_push_to_bq = (req, res) => {

  let origin = req.get('origin');
  console.log(`origin = ${origin}`);
  res.set('Access-Control-Allow-Origin', 'https://www.betfred.com');
  res.set('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
  } else {

    if(origin !== 'https://www.betfred.com'){
      res.status('404').send();
    } else {
      let rows = req.body; 
      console.log("rows",rows);
      rows = JSON.parse(rows);
      
      function formatDate(d){
      var dateFormatted = new Date(Number(d));
      dateFormatted = new Date(dateFormatted.getTime())
      return dateFormatted.toISOString().split('T')[0]
      };

      function formatTimestamp(d){
      var timestampFormatted = new Date(Number(d));
      timestampFormatted = new Date(timestampFormatted.getTime())
      return timestampFormatted.toISOString();
      };

      let unixTimestamp = (new Date()).getTimezoneOffset() * 60000;
      let processedTimestamp = (new Date(Date.now() - unixTimestamp)).toISOString().slice(0, -1);
      

      let dateFormat = new Date().getTime();

      function newFormatDate(date) {
      var d = new Date(date),
          month = '' + (d.getMonth() + 1),
          day = '' + d.getDate(),
          year = d.getFullYear();

      if (month.length < 2) 
          month = '0' + month;
      if (day.length < 2) 
          day = '0' + day;

      return [year, month, day].join('-');
      };


      let object = {
        event: rows.event,
        date: newFormatDate(dateFormat),
        timestamp : rows.date,
        processed_timestamp: dateFormat,
        page: rows.page,
        payload: rows.payload,
        payload_length: rows.length
      };
      let arr = [];
      arr.push(object);
      
      const dataset = bigQuery.dataset("ga_tables");
      let table = dataset.table("payload_analysis");
      
      table.insert(arr).then((data) => {
        var apiResponse = data[0];
        console.log({"message":"inserted rows","apiResponse":apiResponse});
        res.status('200').send(data);
      }).catch((error) => {
        if (error.name === 'PartialFailureError') {
          console.log({"PartialFailureError": error});
          res.status('500').send();
        } else {
          console.log({"TotalFailureError": error});
          res.status('500').send();
        }
      });
    }
  }
};



