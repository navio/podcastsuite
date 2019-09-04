/*
  Receives a fn and report the progress of the content request.
  @params progress 
  @return Response.
*/
export default function (progress = () => null){
    return (response) => {
      if (!response.ok) {
        throw Error(`Server responded ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength,10);
      const reader = response.body.getReader();
      let loaded = 0

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