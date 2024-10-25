let module_base_pattern_arr = []

function padEnd(str, targetLength) {
    while (str.length < targetLength) {
        str += ' ';
    }
    return str;
}

function generatePatternArm64(module_base) {
    let address_str = module_base.toString(16);
    if (address_str.length % 2 !== 0) {
        address_str = '0' + address_str;
    }

    module_base_pattern_arr.length = 0;
    for (let i = 0; i < address_str.length; i += 2) {
        module_base_pattern_arr.push(address_str.substring(i, i + 2));
    }

    const base_byte = module_base_pattern_arr[0];
    const how_many_00_needs = Process.pointerSize - module_base_pattern_arr.length - 1;
    let pattern = base_byte;

    const how_many_questionmark_needs_first = Process.pointerSize - how_many_00_needs - 1;
    pattern += " 00".repeat(how_many_00_needs) + " ??".repeat(how_many_questionmark_needs_first);

    const how_many_questionmark_needs_second = Process.pointerSize - how_many_00_needs - 2;
    pattern += ` ${base_byte}`
    pattern += ` 00`.repeat(how_many_00_needs) + " ??".repeat(how_many_questionmark_needs_second);

    pattern += ` ${module_base_pattern_arr[1]} ${base_byte}`
    pattern += ` 00`.repeat(how_many_00_needs);

    return pattern;
}

const ensureCodeReadableModule = new CModule(`
    #include <gum/gummemory.h>

    void ensure_code_readable(gconstpointer address, gsize size) {
        gum_ensure_code_readable(address, size);
    }
`);

let ensure_code_readable = new NativeFunction(ensureCodeReadableModule.ensure_code_readable, 'void', ['pointer', 'uint64']);

function scanJNINativeMethod(module) {
    console.log(`\nModule: ${module.name}`);
    console.log(`Class\t\tMethod\t\tSig\t\tFunction Ptr\t\tOffset`);
    console.log(`================================================================================================`);
    
    const pattern = generatePatternArm64(module.base);
    ensure_code_readable(ptr(module.base), module.size);
    
    for (const match of Memory.scanSync(module.base, module.size, pattern)) {
        let JNINativeMethod = match.address.sub(module_base_pattern_arr.length - 1);
        try {
            let method_name =  JNINativeMethod.readPointer().readUtf8String();
            let regex_for_non_method = /-|\s|\(|\)|%|,|\[|\]/;
            if (method_name == "" || method_name.match(regex_for_non_method)) {
                continue;
            }

            let method_sig =  JNINativeMethod.add(Process.pointerSize).readPointer().readUtf8String();
            if (method_sig.indexOf("(") >= 0 && method_sig.indexOf(")") >= 0) {
                let method_fnptr =  JNINativeMethod.add(Process.pointerSize * 2).readPointer();
                if ((method_fnptr >= module.base) && (method_fnptr <= module.base.add(module.size))) {
                    Java.perform(function() {
                        const groups = Java.enumerateMethods(`*!${method_name}`)
                        let class_name;
                        if (groups[0] === undefined) {
                            class_name = "undefined";
                        } else {
                            class_name = groups[0].classes[0].name;
                        }
                    
                        console.log(`${class_name}${padEnd("",10)}${method_name}${padEnd("",10)}${method_sig}${padEnd("",10)}${method_fnptr}${padEnd("",10)}${module.name}!${method_fnptr.sub(module.base)}`);
                    })
                }
            }
        } catch (error) {
            // console.log(error);
            continue;
        }
    }
}

function init(module_name) {
    if (module_name === undefined || module_name === "") {
        console.log('Provide the module name that you want to know.');
        return;
    } else {
        let module = Process.findModuleByName(module_name);
        if (module === undefined) {
            console.log(`Cannot find ${module}`);
            return;
        }
        scanJNINativeMethod(module);
    }
}
