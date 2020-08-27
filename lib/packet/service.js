"use strict";
const net = require("net");
const pb = require("./pb");
const common = require("./common");
const BUF0 = Buffer.alloc(0);

/**
 * @param {Number} uin 
 * @param {Buffer} buf 
 * @param {Buffer} md5 
 * @param {Buffer} key 
 * @param {Number} cmd 
 * @returns {Buffer[]}
 */
function buildHighwayUploadRequestPackets(uin, buf, md5, key, cmd, seq = common.rand()) {
    uin = uin.toString();
    const packets = [], limit = 65536, size = buf.length;
    let chunk, offset = 0;
    while (1) {
        chunk = buf.slice(offset, offset + limit);
        if (!chunk.length) break;
        const head = pb.encode("ReqDataHighwayHead", {
            msgBasehead: {
                version:    1,
                uin:        uin,
                command:    "PicUp.DataUp",
                seq:        seq++,
                appid:      537062409,
                dataflag:   4096,
                commandId:  cmd,
                localeId:   2052,
            },
            msgSeghead: {
                filesize:       size,
                dataoffset:     offset,
                datalength:     chunk.length,
                serviceticket:  key,
                md5:            common.md5(chunk),
                fileMd5:        md5,
            },
            reqExtendinfo: BUF0,
        });
        offset += limit;
        const _ = Buffer.alloc(9);
        _.writeUInt8(40);
        _.writeUInt32BE(head.length, 1);
        _.writeUInt32BE(chunk.length, 5);
        const __ = Buffer.from([41]);
        packets.push(Buffer.concat([_, head, chunk, __]));
    }
    return packets;
}

/**
 * @async
 * @param {Number} uin 
 * @param {Number} ip Int32ip
 * @param {Number} port 
 * @param {Object} data 
 * @param {Number} cmd 
 * @returns {Promise}
 */
async function highwayUpload(uin, ip, port, data, cmd) {
    ip = [
        ip & 0xff,
        (ip & 0xff00 ) >> 8,
        (ip & 0xff0000 ) >> 16,
        (ip & 0xff000000 ) >> 24 & 0xff,
    ].join(".");
    return new Promise((resolve)=>{
        const client = net.connect(port, ip, ()=>{
            let n = 0;
            packets.forEach((v)=>{
                client.write(v, ()=>{
                    ++n;
                    if (n === packets.length) {
                        client.end();
                        resolve();
                    }
                });
            });
        });
        client.on("close", resolve);
        client.on("error", resolve);
        var packets = buildHighwayUploadRequestPackets(uin, data.buf, data.md5, data.key, cmd);
    })
}

/**
 * @async
 * @param {Number} uin 
 * @param {Number[]} ips 
 * @param {Number[]} ports 
 * @param {Object[]} images 
 * @returns {Promise} 
 */
async function uploadImages(uin, ips, ports, images) {
    const tasks = [];
    for (let i = 0; i < images.length; ++i) {
        const v = images[i];
        if (v.exists || !v.buf) continue;
        const index = i % ips.length;
        tasks.push(highwayUpload(uin, ips[index], ports[index], v, 2));
    }
    await Promise.all(tasks);
}

/**
 * @async
 * @param {Number} uin 
 * @param {Number[]} ips 
 * @param {Number[]} ports 
 * @param {Object} msg 
 * @returns {Promise} 
 */
async function uploadGroupMessage(uin, ips, ports, msg) {
    await highwayUpload(uin, ips[0], ports[0], msg, 27);
}

module.exports = {
    uploadImages, uploadGroupMessage
}