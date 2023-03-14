const CONFIG = {
    colors: ['white', 'black'],
    fileName: 'Image',
    zipName: 'images.zip',
    error_message: {
        title_image: 'Lỗi ảnh, vui lòng chọn 1 ảnh khác !',
        upload: 'Đã xảy ra lỗi, vui lòng tải lại trang'
    },
    api: {
        removeBg: 'https://chuyenreview.net/removebg.php'
    }
}



jQuery(document).ready(function () {
    ImgUpload();
});
function ImgUpload() {
    const $body = $('body');
    const $input = $('.upload__inputFile')
    const $boxDrop = $('#s-drop-img');
    let selectedColor = ''
    let colors = CONFIG.colors
    let imgWrap = "";
    let imgArray = [];
    let index = 0;

    colors.forEach(color => {
        $('.select-bg').append(`<button data-color="${color}"><span style="background: ${color};"></span></button>`)
    })

    $boxDrop.on('dragover', function(e) {
        e.preventDefault();
        $boxDrop.addClass('drag-over');
    });

    $boxDrop.on('dragleave', function() {
        $boxDrop.removeClass('drag-over');
    });

    $boxDrop.on('drop', function(e) {
        e.stopPropagation();
        e.preventDefault();
        $boxDrop.removeClass('drag-over');
        const files = e.originalEvent.dataTransfer.files;
        $input.prop('files', files)

        const event = $.Event('change')
        $input.trigger(event)
    })

    $input.each(async function () {
        $(this).on('change', async function (e) {
            try {
                setLoading(true)

                imgWrap = $('.upload__img-wrap');

                const files = e.target.files;
                const filesArr = Array.prototype.slice.call(files);

                const fileImages = filesArr.filter(file => file.type.match('image.*'))

                const res = await Promise.allSettled(fileImages.map(async (file) => {
                    const formData = new FormData()
                    formData.append('file', file)
                    const raw = await fetch(CONFIG.api.removeBg, {
                        method: 'POST',
                        body: formData
                    })
                    return await raw.json()
                }))

                res.forEach((file) => {
                    ++index;
                    const name = new Date().getTime() + index;
                    const url = file.value?.image_base64
                    imgArray.push({
                        file: file.value,
                        name,
                        index,
                        url
                    });
                    const html = `<div class='upload__img-box'>
                                        <div data-number='${index}' data-file='${name}' class='img-bg drop-img-item'>
                                            <img src="${url}" alt="${url ? name : CONFIG.error_message.title_image}">
                                            <div class='upload__img-close'></div>
                                        </div>
                                    </div>`;
                    imgWrap.prepend(html);
                })

                setLoading(false)
            } catch {
                setLoading(false)
                alert(CONFIG.error_message.upload)
            }
        });
    });

    $body.on('click', ".upload__img-close", function (e) {
        const file = $(this).parent().data("file");
        for (let i = 0; i < imgArray.length; i++) {
            if (imgArray[i].name === file) {
                imgArray.splice(i, 1);
                break;
            }
        }
        $(this).parent().parent().remove();
    });

    $body.on('click', "#btn-saveToZip", async function (e) {
        await injectBgToCanvas(imgArray, selectedColor)
    })

    $body.on('click', ".select-bg button", function (e) {
        selectedColor = $(this).data('color');
        $(".select-bg button").removeClass('active')
        $(':root').css('--bg-fill', selectedColor)
        $(this).addClass('active')
    })


    function base64ToCanvas(base64, color, callback) {
        let img = new Image();
        return new Promise((resolve, reject) => {
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // create new canvas
                const newCanvas = document.createElement('canvas');
                newCanvas.width = canvas.width;
                newCanvas.height = canvas.height;
                const newCtx = newCanvas.getContext('2d');

                // create box and fill color
                newCtx.fillStyle = color || 'rgb(255 255 255 / 0%)';
                newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);

                // generate new canvas
                newCtx.drawImage(canvas, 0, 0);

                callback && callback(newCanvas);
                resolve(newCanvas)
            };
            img.src = base64;
        })
    }

    function downloadCanvas (canvases) {
        try {
            const zip = new JSZip()

            for (let i = 0; i < canvases.length; i++) {
                let canvas = canvases[i];

                // Convert the canvas to a data URL
                const dataURL = canvas.toDataURL();

                // Add the data URL to the zip file
                zip.file(`${CONFIG.fileName}_${i}.png`, dataURL.substr(dataURL.indexOf(',') + 1), {base64: true});
            }

            // Generate the zip file and download it
            zip.generateAsync({type:"blob"}).then(function(content) {
                saveAs(content, CONFIG.zipName);
            });
        } catch (error) {
            alert(`Failed to download: ${error?.message}`)
        }

    }
    async function injectBgToCanvas (arr, color = '') {
        try {
            const canvases = await Promise.all(arr.filter(item => !!item?.url).map(async img => await base64ToCanvas(img?.url, color)))
            downloadCanvas(canvases)
        } catch(error){
            console.log({error})
        }
    }

    function setLoading(status) {
        const $el = $('#s-loading')
        $el.css('display', status ? 'flex' : 'none')
    }
}
