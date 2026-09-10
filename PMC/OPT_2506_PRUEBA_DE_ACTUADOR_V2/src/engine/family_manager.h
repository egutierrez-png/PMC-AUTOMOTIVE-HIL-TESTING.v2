#pragma once
#include <Arduino.h>
#include "../config.h"
#include "recipe.h"
#include "primitives.h"
#include "../protocol/i_transport.h"

// 👇 Forward declaration para evitar include circular
class TestEngine;
class ITransport;

// Tipo enumerado claro y fuerte
enum class FamilyType : uint8_t {
    UNKNOWN = 0,
    V114,
    VTG,
    VTG_JD,
    WG
};

class FamilyManager {
public:
    FamilyManager(Primitives& p, TestEngine& engine, ITransport& can, ITransport& uart);
    bool execute(const Recipe& recipe);
    static FamilyType getActive();

private:
    Primitives& _p;
    TestEngine& _engine;
    ITransport&  _can;
    ITransport&  _uart;
};
