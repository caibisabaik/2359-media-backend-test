var PgAPI = require('./pgBase');

class AppTaskManagement {
    constructor(config) {
        this.config = config;
        this.pgApi = null;
    }

    async init(config){
        this.destroy();
        this.pgApi = await PgAPI.create(config.sql);
        if(this.pgApi !== null && this.pgApi !== undefined) {
            return(this);
        } else {
            return(null);
        }
    }

    destroy(){
        if(this.pgApi !== null) {
            this.pgApi.destroy();
            this.pgApi = null;
        }
    }

    static create(config){
        let instance = new AppTaskManagement(config);
        return instance.init(config);
    }

    // input = {[]tasks}
    // tasks = { 'title', 'date', 'startTime', 'endTime', 'frequencyType', 'parentId', 'userId' , {'children{tasks[]}', 'frequencyInterval}}
    addTask(arg) {
        return new Promise (async resolve => {
            let result = {error:null, result:[]};
            for(let task of arg.tasks) {
                let res = await this.pgApi.addTask(task);
                if(res.error === null) {
                    if(task.hasOwnProperty('children')) {
                        res.result.childrenRes = [];
                        for(let child of task.children.tasks) {
                            child.parentId = res.result.id;
                        }
                        let childrenRes = await this.addTask(task.children);
                        res.childrenRes = childrenRes;
                    }
                    result.result.push(res);   
                }
            }
            resolve(result);
        });
    }

    queryTimeLocation(arg) {
        return new Promise (async resolve => {
            let result = {error:null, result:null};
            result = await this.pgApi.timeLocationQuery(arg);
            resolve(result);
        });
    }
    // registerUser(arg) {
    //     return new Promise (resolve => {
    //         this.pgApi.registerUser(arg).then(res => {
    //             resolve(res);
    //         }).catch(e => {
    //             resolve(e);
    //         });
    //     });
    // }

    // validPhoneNumber(arg) {
    //     return new Promise (resolve => {
    //         this.pgApi.validPhoneNumber(arg).then(res => {
    //             resolve(res);
    //         }).catch(e => {
    //             resolve(e);
    //         });
    //     });
    // }

    // validEmail(arg) {
    //     return new Promise (resolve => {
    //         this.pgApi.validEmail(arg).then(res => {
    //             resolve(res);
    //         }).catch(e => {
    //             resolve(e);
    //         });
    //     });
    // }
}

module.exports = AppTaskManagement;