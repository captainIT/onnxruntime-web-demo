const fileSelect = document.getElementById("fileSelect");

const worker = new Worker("det-worker.js");
let boxes = [];
let busy = false;

fileSelect.onchange = (event) => {
    const file = event.target.files[0];
    console.log("=======" + file.name+"=======")
    if (file && file.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {

                const width = Math.ceil(img.width/2 / 32) * 32;
                const height = Math.ceil(img.height/2 / 32) * 32;

                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = width;
                canvas.height = height;
                ctx.scale(0.5, 0.5);
                ctx.drawImage(img, 0, 0);

                // 获取图像像素数据
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                console.log(pixels); // 这是一个包含图像像素数据的数组

                const red = [], green = [], blue = [];
                for (let index=0;index<pixels.length;index+=4) {
                    red.push(pixels[index]);
                    green.push(pixels[index+1]);
                    blue.push(pixels[index+2]);
                }
                let all=[...red,...green,...blue]
                worker.postMessage([red, width, height]);

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
    boxes =  process_output(output, canvas.width, canvas.height);
    draw_boxes(canvas, boxes);
    console.log("=======" + boxes+"=======")
    busy = false;
};
function process_output(output, img_width, img_height) {
    let boxes = [];
    let dims=output['dims']
    let cpuData=output['cpuData']
    let labelCount=dims[2]-5
    for (let index=0;index<cpuData.length;index=index+7) {
        let prob = cpuData[index+4]
        if (prob < 0.7) {
            continue;
        }
        const label = cpuData[index+4]==cpuData[index+5]?"第一类":"第二类";
        const xc = cpuData[index];
        const yc = cpuData[1+index];
        const w = cpuData[2+index];
        const h = cpuData[3+index];

        boxes.push([xc*2,yc*2,w*2,h*2,label,prob]);
    }
    boxes = boxes.sort((box1,box2) => box2[5]-box1[5])
    const result = [];
    while (boxes.length>0) {
        result.push(boxes[0]);
        boxes = boxes.filter(box => iou(boxes[0],box)<0.7 || boxes[0][4] !== box[4]);
    }
    return result;
}

function iou(box1,box2) {
    return intersection(box1,box2)/union(box1,box2);
}

function union(box1,box2) {
    const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
    const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
    const box1_area = (box1_x2-box1_x1)*(box1_y2-box1_y1)
    const box2_area = (box2_x2-box2_x1)*(box2_y2-box2_y1)
    return box1_area + box2_area - intersection(box1,box2)
}

function intersection(box1,box2) {
    const [box1_x1,box1_y1,box1_x2,box1_y2] = box1;
    const [box2_x1,box2_y1,box2_x2,box2_y2] = box2;
    const x1 = Math.max(box1_x1,box2_x1);
    const y1 = Math.max(box1_y1,box2_y1);
    const x2 = Math.min(box1_x2,box2_x2);
    const y2 = Math.min(box1_y2,box2_y2);
    return (x2-x1)*(y2-y1)
}

function draw_boxes(canvas,boxes) {
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.font = "18px serif";
    boxes.forEach(([x1,y1,x2,y2,label,score]) => {
        ctx.strokeRect(x1,y1,x2-x1,y2-y1);
        ctx.fillStyle = "#00ff00";
        const width = ctx.measureText(label).width;
        ctx.fillRect(x1,y1,width+10,25);
        ctx.fillStyle = "#000000";
        ctx.fillText(label, x1, y1+18);
        ctx.fillStyle = "#00ffff";
        ctx.fillText(score, x1+width+20, y1+18);
    });
}
