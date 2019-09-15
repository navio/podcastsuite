/*
  Receives a fn and report the progress of the content request.
  @params progress 
  @return Response.
*/
export default function (progress){
    return (response) => {

      const reader = response.body &&
                     response.body.getReader &&
                     response.body.getReader();

      if(!progress || !reader ) {  return response; }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength,10);
      let loaded = 0;

      return new Response(
        new ReadableStream({
          start(controller) {
            read();
            function read() {
              reader.read().then(({done, value}) => {
                if (done) {
                  if (total === 0) {
                    //begining
                    progress({loaded, total});
                  }
                  controller.close();
                  return;
                }
                
                // return progress
                loaded += value.byteLength;
                progress({loaded, total});
                controller.enqueue(value);
                read();

              }).catch(error => {
                console.error(error);
                controller.error(error)
              }); 
            }
          }
        })
      )
    };
  };