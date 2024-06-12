importScripts("https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.webgpu.min.js");
let model = null;
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/"

onmessage = async(event) => {
    const input = event.data[0];
    const width = event.data[1];
    const height = event.data[2];
    const output = await run_model(input,width,height);
    postMessage(output);
}


async function run_model(input,width,height) {
    if (!model) {

        model =  await ort.InferenceSession.create("./ldf.onnx",{ executionProviders: ["webgpu"] });
    }
    input = new ort.Tensor(Float32Array.from(input),[1, 1, height,width]);
    const outputs = await model.run({input:input});
    return outputs["output"];
}
