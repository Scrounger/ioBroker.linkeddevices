// this file used only for simulation and not used in end build

import React from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import withStyles from '@mui/styles/withStyles';

import GenericApp from '@iobroker/adapter-react-v5/GenericApp';
import I18n from '@iobroker/adapter-react-v5/i18n';
import Loader from '@iobroker/adapter-react-v5/Components/Loader';

import LinkedIdComponent from './LinkedIdComponent';

const styles = theme => ({
    app: {
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
        height: '100%',
    },
    item: {
        padding: 50,
        width: 400,
    }
});

class App extends GenericApp {
    constructor(props) {
        const extendedProps = { ...props };
        super(props, extendedProps);

        this.state = {
            data: { myCustomAttribute: 'prefix1.prefix2.state' },
            theme: this.createTheme(),
        };

        I18n.setLanguage((navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase());
    }

    render() {
        if (!this.state.loaded) {
            return <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <Loader theme={this.state.themeType} />
                </ThemeProvider>
            </StyledEngineProvider>;
        }

        return <StyledEngineProvider injectFirst>
            <ThemeProvider theme={this.state.theme}>
                <div className={this.props.classes.app}>
                    <div className={this.props.classes.item}>
                        <LinkedIdComponent
                            socket={this.socket}
                            themeType={this.state.themeType}
                            themeName={this.state.themeName}
                            attr='myCustomAttribute'
                            data={this.state.data}
                            onError={() => {}}
                            customObj={{ _id: 'test.0.myPrefix.myState' }}
                            alive
                            adapterName="linkeddevices"
                            instance="0"
                            schema={{
                                name: 'AdminComponentLinkedDevicesSet/Components/LinkedIdComponent',
                                type: 'custom',
                            }}
                            onChange={data => {
                                this.setState({ data });
                            }}
                        />
                    </div>
                </div>
            </ThemeProvider>
        </StyledEngineProvider>;
    }
}

export default withStyles(styles)(App);