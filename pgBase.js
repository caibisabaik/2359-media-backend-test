const Sequelize = require('sequelize');
const { Op } = require('sequelize');
const PostGre = require('pg');

class PgBase {
    constructor(config) {
        this.config = config;
        this.pg = null;
        this.seq = null;
        this.models = null;
    }

    async init(config){
        this.destroy();
        this.pg = new PostGre.Pool(config);
        this.seq = await this.initDb();
        this.models = await SeqModels.create(this.seq);
        if(this.seq !== null) {
            await this.seq.sync();
            return this;
        } else {
            return null;
        }
        
    }

    destroy(){
        if(this.seq !== null) {
            this.seq.close();
            this.seq = null;
        }
    }

    static create(config){
        let instance = new PgBase(config);
        return instance.init(config);
    }

    initDb() {
        return new Promise(async (resolve) => {
            this.pg.query('CREATE DATABASE ' + this.config.database, [], async (res) => {
                if(res) {
                    if(res.code === "3D000") {
                        try {
                            const dbCreateRes =  await this.createDatabase();
                            if(!dbCreateRes) {
                                resolve(null);
                            }
                        } catch (e) {
                            resolve(null);
                        };
                    }
                    console.log(`${this.config.database} db is exists, opening connection to postGres`); 
                    const seq = new Sequelize(this.config.database, this.config.user, this.config.password, {
                        dialect: 'postgres',
                        pool: {
                            max: 5,
                            min: 0,
                            idle: 10000
                        },
                    });
                    this.pg.end();
                    resolve(seq);
                }
            });
        });
    }

    createDatabase() {
        const seq = new Sequelize(this.config.defaultDatabase, this.config.user, this.config.password, {
            dialect: 'postgres',
        });
        console.log(seq);
        return new Promise (async (resolve) => {
            seq.query(`CREATE DATABASE ${this.config.database};`).then(data => {
                resolve(seq);
            }).catch(e=> {
                resolve(null);
            });
        });
    }

    isDatabaseConnected () {
        let result = {error:null, result:null};
        if(this.seq === null) {
            result.error = true;
            result.result = "database is not connected";
        }
        return result;
    }

    isArgumentContains(arg, propertyArray){
        for(let i=0 ; i<propertyArray.length ; i++){
            if(arg.hasOwnProperty(propertyArray[i]) == false){
                return {
                    error:true,
                    result: propertyArray[i]+' is undefined'
                }
            }
        }
        return {error:null, result:true}
    }

    isArgumentPropNull(arg, propertyArray){
        for(let i=0 ; i<propertyArray.length ; i++){
            if(arg[propertyArray[i]] === null){
                return {
                    error:true,
                    result: propertyArray[i]+' is null'
                }
            }
        }
        return {error:null, result:true}
    }

    pgPreflightCheck(arg, propertyArray=[]){
        let result = this.isDatabaseConnected();

        if(result.error === null){
            result = this.isArgumentContains(arg, propertyArray);
        }
        return result;
    }

    addTask (arg) {
        return new Promise(async resolve => {
            let result = this.pgPreflightCheck(arg, ['title', 'date', 'startTime', 'endTime', 'frequencyType', 'parentId', 'userId']);
            if(result.error === null) {
                // check if date n time clashes
                result = await this.checkClashedTask(arg);
                if(result.error === null) {
                    this.models['task'].create(arg).then(res => {
                        result.result = res;
                        resolve(result);
                    }).catch(e => {
                        result.error = true;
                        result.result = e;
                        resolve(result);
                    });
                }
            }
        });
    }

    checkClashedTask (arg) {
        return new Promise(resolve => {
            let result = this.pgPreflightCheck(arg, ['date', 'startTime', 'endTime','userId']);
            if(result.error === null) {
                resolve(result);
            } else {
                // send error response
                resolve(result);
            }
        });
    }

    timeLocationQuery (arg) {
        return new Promise(resolve => {
            let result = {error:null, result:null};
            if(arg.hasOwnProperty('dateStart')) {
                if(arg.hasOwnProperty('location')) {
                    result = this.pgPreflightCheck(arg, ['dateStart', 'dateEnd', 'startTime', 'endTime','userId', 'location']);
                    if(result.error === null) {
                        this.models['task'].findAll({
                            where: {
                                userId : arg.userId,
                                date : {
                                    [Op.between] : [arg.dateStart, arg.dateEnd]
                                },
                                startTime : {
                                    [Op.gte] : arg.startTime
                                },
                                endTime : {
                                    [Op.lte] : arg.endTime
                                },
                                location : arg.location
                            }
                        }).then(res => {
                            result.result = res;
                            resolve(result);
                        }).catch(e => {
                            result.error = true;
                            result.result = e;
                            resolve(result);
                        });
                    }
                } else {
                    result = this.pgPreflightCheck(arg, ['dateStart', 'dateEnd', 'startTime', 'endTime','userId']);
                    if(result.error === null) {
                       this.models['task'].findAll({
                            where: {
                                userId : arg.userId,
                                date : {
                                    [Op.between] : [arg.dateStart, arg.dateEnd]
                                },
                                startTime : {
                                    [Op.gte] : arg.startTime
                                },
                                endTime : {
                                    [Op.lte] : arg.endTime
                                },
                            }
                        }).then(res => {
                            result.result = res;
                            resolve(result);
                        }).catch(e => {
                            result.error = true;
                            result.result = e;
                            resolve(result);
                        });
                    }
                }
            } else {
                result = this.pgPreflightCheck(arg, ['userId', 'location']);
                if(result.error === null) {
                   this.models['task'].findAll({
                        where: {
                            userId : arg.userId,
                            location : arg.location
                        }
                    }).then(res => {
                        result.result = res;
                        resolve(result);
                    }).catch(e => {
                        result.error = true;
                        result.result = e;
                        resolve(result);
                    });
                }
            }
        });
    }

    registerUser(arg) {
        return new Promise (async (resolve) => {
            let result = this.pgPreflightCheck(arg, ['phoneNumber', 'firstName', 'lastName', 'email', 'birthDate', 'gender']);
            let phoneValidationRes = this.validPhoneNumber({phoneNumber:arg.phoneNumber});
            let emailValidationRes = this.validEmail({email:arg.email});
            if(phoneValidationRes.result && emailValidationRes.result) {
                this.models['user'].create(arg).then(res => {
                    result.result = res;
                    resolve(result);
                }).catch(e => {
                    result.error = e;
                    resolve(result);
                });
            } else {
                result.error = true;
                result.result = 'Failed to create new user, phoneNumber and/or email has been register';
                resolve(result);
            }
        });
    }

    validPhoneNumber(arg) {
        return new Promise ((resolve) => {
            let result = this.pgPreflightCheck(arg, ['phoneNumber']);
            this.models['user'].findOne({where: arg}).then(res => {
                if(res !== null) {
                    result.result = false;
                } else {
                    result.result = true;
                }
                resolve(result);
            }).catch(e => {
                result.error = e;
                resolve(result);
            });
        });
    }

    validEmail(arg) {
        return new Promise ((resolve) => {
            let result = this.pgPreflightCheck(arg, ['email']);
            this.models['user'].findOne({where: arg}).then(res => {
                if(res !== null) {
                    result.result = false;
                } else {
                    result.result = true;
                }
                resolve(result);
            }).catch(e => {
                result.error = e;
                resolve(result);
            });
        });
    }
}

class SeqModels {
    constructor(sequelize) {
        this.seq = sequelize;
        this.models = {};
    }

    async init(){
        this.destroy();
        this.models['user'] = this.userModel();
        this.models['task'] = this.taskModel();
        return this.models;
    }

    destroy(){
        this.models = {};
    }

    static create(sequelize){
        let instance = new SeqModels(sequelize);
        return instance.init();
    }

    userModel() {
        const userModel = this.seq.define('user', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            phoneNumber : {
                type: Sequelize.STRING,
                field: 'mobile_number'
            },
            firstName: {
                type: Sequelize.STRING,
                field: 'first_name' 
            },
            lastName: {
                type: Sequelize.STRING,
                field: 'last_name' 
            },
            email : {
                type: Sequelize.STRING
            },
            birthDate : {
                type: Sequelize.STRING,
                field: 'birth_date'
            },
            gender : {
                type: Sequelize.STRING
            }
          }, {
            freezeTableName: true 
          });
        return userModel;
    }

    taskModel() {
        const taskModel = this.seq.define('task', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            date : {
                type: Sequelize.DATEONLY,
            },
            startTime: {
                type: Sequelize.TIME,
            },
            endTime: {
                type: Sequelize.TIME,
            },
            title: {
                type: Sequelize.STRING,
            },
            location: {
                type: Sequelize.STRING,
            },
            frequencyType: {
                type: Sequelize.INTEGER,
                field: 'freq_type'
            },
            frequencyInterval: { 
                type: Sequelize.INTEGER,
                field: 'freq_Interval'
            },
            parentId: {
                type: Sequelize.INTEGER,
            },
            userId: {
                type: Sequelize.INTEGER,
            }
        }, {
            freezeTableName: true 
        });
        return taskModel;
    }
}

module.exports = PgBase;