const fileSelect = document.getElementById("fileSelect");

const worker = new Worker("seg-worker.js");
let boxes = [];
let interval
let busy = false;

fileSelect.onchange = (event) => {
    const file = event.target.files[0];
    console.log("=======" + file.name+"=======")
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {

                const width = Math.ceil(img.width / 32) * 32;
                const height = Math.ceil(img.height / 32) * 32;

                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0);

                // 获取图像像素数据
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;

                const red = [], green = [], blue = [];
                for (let index=0;index<pixels.length;index+=4) {
                    red.push(pixels[index]);
                    green.push(pixels[index+1]);
                    blue.push(pixels[index+2]);
                }
                let all=[...red,...green,...blue]
                worker.postMessage([red,width,height]);

                // 示例：读取第一个像素的 RGBA 值


            }
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Please select a valid image file.');
    }

}
worker.onmessage = (event) => {
    const output = event.data;
    const canvas = document.getElementById("canvas");
    process_output(output, canvas.width, canvas.height);
    busy = false;
};


function process_output(output, img_width, img_height) {
    let cpuData=output['cpuData']
    const canvas = document.getElementById("resultCanvas");
    canvas.width = img_width;
    canvas.height = img_height;
    const ctx = canvas.getContext('2d');

    const imageData = ctx.createImageData(img_width, img_height);

    for (let i=0;i<img_width*img_height;i+=1) {
        let prob = cpuData[i+img_width*img_height]
        let red=255
        if (prob < 0.2) {
            red=0
        }
        imageData.data[i*4] = red; // R value
        imageData.data[i*4 + 1] = 0; // G value
        imageData.data[i*4 + 2] = 0; // B value
        imageData.data[i*4 + 3] = 100; // A value
    }
// 将图像数据放回canvas
    ctx.putImageData(imageData, 0, 0);
}
