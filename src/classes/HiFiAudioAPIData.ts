/**
 * This Module contains classes relevant to data about a user in the virtual 3D environment.
 * @packageDocumentation
 */

import { recursivelyDiffObjects } from "../utilities/HiFiUtilities";

/**
 * Instantiations of this class define a position in 3D space. The position of a user affects the way the mixed spatial
 * audio is heard by the user.
 */
export class Point3D {
    /**
     * By default, +x is to the right and -x is to the left. Units for this member variable are **meters**.
     */
    x: number;
    /**
     * By default, +y is into the screen and -y is out of the screen towards the user. Units for this member variable are **meters**.
     */
    y: number;
    /**
     * By default, +z is up and -z is down. Units for this member variable are **meters**.
     */
    z: number;

    /**
     * Construct a new `Point3D` object. All parameters are optional. Unset parameters will be set to `null`. Remember, all units for member variables are `meters`.
     */
    constructor({ x = null, y = null, z = null }: { x?: number, y?: number, z?: number } = {}) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

/**
 * Instantiations of this class define an orientation in 3D space in Quaternion format. A user's orientation in 3D space
 * affects the way the mixed spatial audio is heard by the user. Additionally, orientation affects the way
 * a user's audio input propagates through a space: speakers facing directly towards a listener will sound louder than
 * speakers facing away from a listener.
 */
export class OrientationQuat3D {
    w: number;
    x: number;
    y: number;
    z: number;

    /**
     * Construct a new `OrientationQuat3D` object. All parameters are required.
     */
    constructor({ w = 1, x = 0, y = 0, z = 0 }: { w?: number, x?: number, y?: number, z?: number } = {}) {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }
}


/**
 * Instantiations of this class define an orientation in 3D space. A user's orientation in 3D space
 * affects the way the mixed spatial audio is heard by the user. Additionally, orientation affects the way
 * a user's audio input propagates through a space: speakers facing directly towards a listener will sound louder than
 * speakers facing away from a listener. By default, the axis configuration is set up to be right-handed.
 */
export class OrientationEuler3D {
    /**
     * Consider an aircraft: "Pitch" is defined as "nose up/down about the axis running from wing to wing".
     * **Negative pitch** means that the aircraft moves its nose **closer to the ground**.
     * **Positive pitch** means that the aircraft moves its nose **away from the ground**.
     * Units here are degrees.
     */
    pitchDegrees: number;
    /**
     * Consider an aircraft: "Yaw" is defined as "nose left/right about the axis running up and down".
     * **Negative yaw** means that the aircraft will rotate **clockwise** when viewing the aircraft from above.
     * **Positive yaw** means that the aircraft will rotate **counter-clockwise** when viewing the aircraft from above.
     * Units here are degrees.
     */
    yawDegrees: number;
    /**
     * Consider an aircraft: "Roll" is defined as "rotation about the axis running from nose to tail".
     * **Positive roll** means that the aircraft's **right wing will move closer to the ground**.
     * **Negative roll** means that the aircraft's **left wing will move closer to the ground**.
     * Units here are degrees.
     */
    rollDegrees: number;

    /**
     * Construct a new `OrientationEuler3D` object. All parameters are optional. Unset parameters will be set to `0`. Remember, all units for member variables are `degrees`.
     */
    constructor({ pitchDegrees = 0, yawDegrees = 0, rollDegrees = 0 }: { pitchDegrees?: number, yawDegrees?: number, rollDegrees?: number } = {}) {
        this.pitchDegrees = pitchDegrees;
        this.yawDegrees = yawDegrees;
        this.rollDegrees = rollDegrees;
    }
}

/**
 * Compute the orientation quaternion from the specified euler angles.
 * The resulting quaternion is the rotation transforming from combining the euler angles rotations in the explicit order
 *  1/ Yaw, rotating around the vertical axis
 *  2/ Pitch, rotating around the right axis 
 *  3/ Roll, rotating around the front axis
 * 
 * @param yawDegrees - The yaw angle rotation in degrees.
 * @param pitchDegrees - The pitch angle rotation in degrees.
 * @param rollDegrees - The roll angle rotation in degrees.
 * 
 * @return The end resulting quaternion defined from the euler angles combination
 */
export function yawPitchRollToQuaternion(euler: OrientationEuler3D): OrientationQuat3D {
    const HALF_DEG_TO_RAD = 0.5 * Math.PI / 180.0;
    let cos = { P: Math.cos(euler.pitchDegrees * HALF_DEG_TO_RAD), Y: Math.cos(euler.yawDegrees * HALF_DEG_TO_RAD), R: Math.cos(euler.rollDegrees * HALF_DEG_TO_RAD)};
    let sin = { P: Math.sin(euler.pitchDegrees * HALF_DEG_TO_RAD), Y: Math.sin(euler.yawDegrees * HALF_DEG_TO_RAD), R: Math.sin(euler.rollDegrees * HALF_DEG_TO_RAD)};
    // Exact same code as glm::eulerAngles
    // from world space rotate Roll, then Yaw then Pitch
    // Resulting rotation is:
    // Vworld = [Y][P][R] Vlistener
    return new OrientationQuat3D({
            w: cos.P * cos.Y * cos.R + sin.P * sin.Y * sin.R,
            x: sin.P * cos.Y * cos.R - cos.P * sin.Y * sin.R,
            y: cos.P * sin.Y * cos.R + sin.P * cos.Y * sin.R,
            z: cos.P * cos.Y * sin.R + sin.P * sin.Y * cos.R
        });
}

export function yawPitchRollFromQuaternion(quat: OrientationQuat3D): OrientationEuler3D {
    const RAD_TO_DEG = 180.0 / Math.PI;
    // yaw = asin(T(-2) * (q.x * q.z - q.w * q.y));
    // pitch = glm::degrees(atan(T(2) * (q.y * q.z + q.w * q.x), q.w * q.w - q.x * q.x - q.y * q.y + q.z * q.z));
    // roll = glm::degrees(atan(T(2) * (q.x * q.y + q.w * q.z), q.w * q.w + q.x * q.x - q.y * q.y - q.z * q.z));
    let qx2 = quat.x * quat.x;
    let qy2 = quat.y * quat.y;
    let qz2 = quat.z * quat.z;
    let qw2 = quat.w * quat.w;
    let qwx = quat.w * quat.x;
    let qwy = quat.w * quat.y;
    let qwz = quat.w * quat.z;
    let qxy = quat.x * quat.y;
    let qyz = quat.y * quat.z;
    let qzx = quat.z * quat.x;
    // ROT Mat33 =  {  1 - 2qy2 - 2qz2  |  2(qxy - qwz)    |  2(qxz + qwy)  }
    //              {  2(qxy + qwz)     |  1 - 2qx2 - 2qz2 |  2(qyz - qwx)  }
    //              {  2(qxz + qwy)     |  2(qyz + qwx)    |  1 - 2qx2 - 2qy2  }
        

    return new OrientationEuler3D({
        yawDegrees: RAD_TO_DEG * Math.asin( -2.0 * (qzx - qwy)),
        pitchDegrees: RAD_TO_DEG * Math.atan2( 2.0 * (qyz + qwx), qw2 - qx2 - qy2 + qz2),
        rollDegrees: RAD_TO_DEG * Math.atan2( 2.0 * (qxy + qwz), qw2 + qx2 - qy2 - qz2)
    });
}


/**
 * Compute the orientation quaternion from the specified euler angles in the order Roll, Yaw, Pitch.
 * The resulting quaternion is the rotation transforming from combining the euler angles rotations in the explicit order
 *  1/ Roll, rotating around the back axis
 *  2/ Yaw, rotating around the vertical axis
 *  3/ Pitch, rotating around the right axis
 * 
 * 
 * @param rollDegrees - The roll angle rotation in degrees.
 * @param yawDegrees - The yaw angle rotation in degrees.
 * @param pitchDegrees - The pitch angle rotation in degrees.
 * 
 * @return The end resulting quaternion defined from the euler angles combination
 */
export function rollYawPitchToQuaternion(euler: OrientationEuler3D): OrientationQuat3D {
    const HALF_DEG_TO_RAD = 0.5 * Math.PI / 180.0;
    let cos = { P: Math.cos(euler.pitchDegrees * HALF_DEG_TO_RAD), Y: Math.cos(euler.yawDegrees * HALF_DEG_TO_RAD), R: Math.cos(euler.rollDegrees * HALF_DEG_TO_RAD)};
    let sin = { P: Math.sin(euler.pitchDegrees * HALF_DEG_TO_RAD), Y: Math.sin(euler.yawDegrees * HALF_DEG_TO_RAD), R: Math.sin(euler.rollDegrees * HALF_DEG_TO_RAD)};
    // Exact same code as glm::eulerAngles
    // from world space rotate Roll, then Yaw then Pitch
    // Resulting rotation is:
    // Vworld = [R][Y][P] Vlistener
    return new OrientationQuat3D({
            w: cos.P * cos.Y * cos.R + sin.P * sin.Y * sin.R,
            x: sin.P * cos.Y * cos.R - cos.P * sin.Y * sin.R,
            y: cos.P * sin.Y * cos.R + sin.P * cos.Y * sin.R,
            z: cos.P * cos.Y * sin.R + sin.P * sin.Y * cos.R
        });
}

export function rollYawPitchFromQuaternion(quat: OrientationQuat3D): OrientationEuler3D {
    const RAD_TO_DEG = 180.0 / Math.PI;
    // yaw = asin(T(-2) * (q.x * q.z - q.w * q.y));
    // pitch = glm::degrees(atan(T(2) * (q.y * q.z + q.w * q.x), q.w * q.w - q.x * q.x - q.y * q.y + q.z * q.z));
    // roll = glm::degrees(atan(T(2) * (q.x * q.y + q.w * q.z), q.w * q.w + q.x * q.x - q.y * q.y - q.z * q.z));
    let qx2 = quat.x * quat.x;
    let qy2 = quat.y * quat.y;
    let qz2 = quat.z * quat.z;
    let qw2 = quat.w * quat.w;
    return new OrientationEuler3D({
        yawDegrees: RAD_TO_DEG * Math.asin( -2 * (quat.x * quat.z - quat.w * quat.y)),
        pitchDegrees: RAD_TO_DEG * Math.atan2( 2 * (quat.y * quat.z + quat.w * quat.x), qw2 - qx2 - qy2 + qz2),
        rollDegrees: RAD_TO_DEG * Math.atan2( 2 * (quat.x * quat.y + quat.w * quat.z), qw2 + qx2 - qy2 - qz2)
    });
}

/**
 * Instantiations of this class contain all of the data that is possible to **send to AND receive from** the High Fidelity Audio API Server.
 * All member data inside this `class` can be sent to the High Fidelity Audio API Server. See below for more details.
 * 
 * See {@link ReceivedHiFiAudioAPIData} for data that can't be sent to the Server, but rather can only be received from the Server (i.e. `volumeDecibels`).
 * 
 * Member data of this class that is sent to the Server will affect the final mixed spatial audio for all listeners in the server's virtual space.
 */
export class HiFiAudioAPIData {
    position: Point3D;
    orientation: OrientationQuat3D;
    hiFiGain: number;

    /**
     * 
     * @param __namedParameters
     * @param position If you don't supply a `position` when constructing instantiations of this class, `position` will be `null`.
     * 
     * ✔ The client sends `position` data to the server when `_transmitHiFiAudioAPIDataToServer()` is called.
     * 
     * ✔ The server sends `position` data to all clients connected to a server during "peer updates".
     * @param orientation If you don't supply an `orientation` when constructing instantiations of this class, `orientation` will be `null`.
     * 
     * ✔ The client sends `orientation` data to the server when `_transmitHiFiAudioAPIDataToServer()` is called.
     * 
     * ✔ The server sends `orientation` data to all clients connected to a server during "peer updates".
     * @param hiFiGain This value affects how loud User A will sound to User B at a given distance in 3D space.
     * This value also affects the distance at which User A can be heard in 3D space.
     * Higher values for User A means that User A will sound louder to other users around User A, and it also means that User A will be audible from a greater distance.
     * If you don't supply an `hiFiGain` when constructing instantiations of this class, `hiFiGain` will be `null`.
     * 
     * ✔ The client sends `hiFiGain` data to the server when `_transmitHiFiAudioAPIDataToServer()` is called.
     * 
     * ✔ The server sends `hiFiGain` data to all clients connected to a server during "peer updates".
     */
    constructor({ position = null, orientation = null, hiFiGain = null }: { position?: Point3D, orientation?: OrientationQuat3D, hiFiGain?: number } = {}) {
        this.position = position;
        this.orientation = orientation;
        this.hiFiGain = hiFiGain;
    }

    /**
     * Used internally for getting the minimal set of data to transmit to the server.
     * @param otherHiFiData The "other" Audio API Data against which we want to compare.
     * @returns The differences between this Audio API Data and the "other" Audio API Data in `HiFiAudioAPIData` format. 
     */
    diff(otherHiFiData: HiFiAudioAPIData): HiFiAudioAPIData {
        let currentHiFiAudioAPIDataObj: any = {
            "position": Object.assign({}, this.position),
            "orientation": Object.assign({}, this.orientation),
        };
        if (typeof (this.hiFiGain) === "number") {
            currentHiFiAudioAPIDataObj["hiFiGain"] = this.hiFiGain;
        }

        let otherHiFiDataObj: any = {
            "position": Object.assign({}, otherHiFiData.position),
            "orientation": Object.assign({}, otherHiFiData.orientation),
        };
        if (typeof (otherHiFiData.hiFiGain) === "number") {
            otherHiFiDataObj["hiFiGain"] = otherHiFiData.hiFiGain;
        }

        let diffObject = recursivelyDiffObjects(currentHiFiAudioAPIDataObj, otherHiFiDataObj);

        let returnValue = new HiFiAudioAPIData();

        if (diffObject.position && (typeof (diffObject.position.x) === "number" || typeof (diffObject.position.y) === "number" || typeof (diffObject.position.z) === "number")) {
            // returnValue.position = new Point3D(diffObject.position);
            // We need to pass the full position data until the mixer can handle fragmented coordinates 
            returnValue.position = new Point3D(otherHiFiData.position);
        }

        if (diffObject.orientation && (typeof (diffObject.orientation.w) === "number" || typeof (diffObject.orientation.x) === "number" || typeof (diffObject.orientation.y) === "number" || typeof (diffObject.orientation.z) === "number")) {
            returnValue.orientation = new OrientationQuat3D({
                w: diffObject.orientation.w ?? currentHiFiAudioAPIDataObj.orientation.w,
                x: diffObject.orientation.x ?? currentHiFiAudioAPIDataObj.orientation.x,
                y: diffObject.orientation.y ?? currentHiFiAudioAPIDataObj.orientation.y,
                z: diffObject.orientation.z ?? currentHiFiAudioAPIDataObj.orientation.z
            });
        }

        if (typeof (diffObject.hiFiGain) === "number") {
            returnValue.hiFiGain = diffObject.hiFiGain;
        }

        return returnValue;
    }
}

/**
 * Instantiations of this class contain all of the data that is possible to **receive from** the High Fidelity Audio API Server.
 * See below for more details.
 * 
 * See {@link HiFiAudioAPIData} for data that can both be sent to and received from the Server (i.e. `position`).
 */
export class ReceivedHiFiAudioAPIData extends HiFiAudioAPIData {
    providedUserID: string;
    hashedVisitID: string;
    volumeDecibels: number;
    
    /**
     * 
     * @param params 
     * @param params.providedUserID This User ID is an arbitrary string provided by an application developer which can be used to identify the user associated with a client.
     * We recommend that this `providedUserID` is unique across all users, but the High Fidelity API will not enforce uniqueness across clients for this value.
     * @param params.hashedVisitID This string is a hashed version of the random UUID that is generated automatically.
     * A connecting client sends this value as the `session` key inside the argument to the `audionet.init` command.
     * It is used to identify a given client across a cloud of mixers and is guaranteed ("guaranteed" given the context of random UUIDS) to be unique.
     * Application developers should not need to interact with or make use of this value, unless they want to use it internally for tracking or other purposes.
     * This value cannot be set by the application developer.
     * @param params.volumeDecibels The current volume of the user in decibels.
     * ❌ The client never sends `volumeDecibels` data to the server.
     * ✔ The server sends `volumeDecibels` data to all clients connected to a server during "peer updates".
     */
    constructor(params: { providedUserID?: string, hashedVisitID?: string, volumeDecibels?: number, position?: Point3D, orientationEuler?: OrientationEuler3D, orientation?: OrientationQuat3D, hiFiGain?: number } = {}) {
        super(params);
        this.providedUserID = params.providedUserID;
        this.hashedVisitID = params.hashedVisitID;
        this.volumeDecibels = params.volumeDecibels;
    }
}